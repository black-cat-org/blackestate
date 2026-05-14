"use server"

import { DrizzleContactRepository } from "@/features/contacts/infrastructure/drizzle-contact.repository"
import { createDealUseCase } from "@/features/deals/application/create-deal.use-case"
import { deleteDealUseCase } from "@/features/deals/application/delete-deal.use-case"
import { getClosedDealsUseCase } from "@/features/deals/application/get-closed-deals.use-case"
import { getDealByIdUseCase } from "@/features/deals/application/get-deal-by-id.use-case"
import { getDealsByContactUseCase } from "@/features/deals/application/get-deals-by-contact.use-case"
import { getDealsByPropertyUseCase } from "@/features/deals/application/get-deals-by-property.use-case"
import { getDealsByStageUseCase } from "@/features/deals/application/get-deals-by-stage.use-case"
import { getDealsUseCase } from "@/features/deals/application/get-deals.use-case"
import { getDeletedDealsUseCase } from "@/features/deals/application/get-deleted-deals.use-case"
import { moveDealStageUseCase } from "@/features/deals/application/move-deal-stage.use-case"
import { reorderDealsInStageUseCase } from "@/features/deals/application/reorder-deals-in-stage.use-case"
import { restoreDealUseCase } from "@/features/deals/application/restore-deal.use-case"
import { updateDealUseCase } from "@/features/deals/application/update-deal.use-case"
import type {
  CreateDealDTO,
  Deal,
  DealStage,
  UpdateDealDTO,
} from "@/features/deals/domain/deal.entity"
import type { MoveDealStageInput } from "@/features/deals/domain/deal.repository"
import { DrizzleDealRepository } from "@/features/deals/infrastructure/drizzle-deal.repository"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { isUniqueViolation } from "@/lib/utils/pg-errors"

// Module-level singletons. The Drizzle adapters are stateless — every
// query opens its own `withRLS` transaction with the per-call
// SessionContext — so a single instance is reusable across the
// process's request lifetime. Repositories are constructed here at the
// presentation boundary, NOT in the use cases (Clean Architecture:
// Application never imports Infrastructure).
//
// Two repos coexist here because `createDealAction` needs both:
// `createDealUseCase` resolves the Contact (via `findOrCreateContact`
// when the form sent `contactDraft`) AND inserts the Deal. The use
// case lives in `features/deals/application/` and receives both repos
// as parameters, which is the documented App→App cross-feature
// exception in CLAUDE.md (every Deal needs a resolved Contact —
// genuine domain coupling, not implementation leak). Same pattern as
// `createInquiryAction` in I8.
const contactRepo = new DrizzleContactRepository()
const dealRepo = new DrizzleDealRepository()

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Active deals (non-deleted, stage NOT IN ('won','lost')). Powers the
 * Kanban board. Closed and trash views have their own actions —
 * `getClosedDealsAction` and `getDeletedDealsAction` — because their
 * sort orders differ (`closed_at DESC` / `deleted_at DESC`) and
 * cannot be expressed as a filter on the active list.
 */
export async function getDealsAction(): Promise<Deal[]> {
  const ctx = await getSessionContext()
  return getDealsUseCase(ctx, dealRepo)
}

export async function getClosedDealsAction(): Promise<Deal[]> {
  const ctx = await getSessionContext()
  return getClosedDealsUseCase(ctx, dealRepo)
}

export async function getDeletedDealsAction(): Promise<Deal[]> {
  const ctx = await getSessionContext()
  return getDeletedDealsUseCase(ctx, dealRepo)
}

export async function getDealByIdAction(id: string): Promise<Deal | undefined> {
  const ctx = await getSessionContext()
  return getDealByIdUseCase(ctx, dealRepo, id)
}

export async function getDealsByContactAction(contactId: string): Promise<Deal[]> {
  const ctx = await getSessionContext()
  return getDealsByContactUseCase(ctx, dealRepo, contactId)
}

export async function getDealsByPropertyAction(propertyId: string): Promise<Deal[]> {
  const ctx = await getSessionContext()
  return getDealsByPropertyUseCase(ctx, dealRepo, propertyId)
}

export async function getDealsByStageAction(stage: DealStage): Promise<Deal[]> {
  const ctx = await getSessionContext()
  return getDealsByStageUseCase(ctx, dealRepo, stage)
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a Deal, handling the race window between the use case's
 * `findActiveByContactAndProperty` dedup check and the actual INSERT.
 *
 * Scenario: two agents (or the agent + the bot) create a Deal on the
 * same (contact, property) at the same time. Both check `findActive` →
 * miss → both INSERT. The partial UNIQUE
 * `deal_unique_active_contact_property` (026) raises 23505 on the
 * loser. Without a retry, the loser surfaces a raw PG error to the UI.
 *
 * Strategy: catch unique violation, re-run the use case once. The
 * second pass's `findActive` will see the winner's row and return it
 * (the createDealUseCase composer already short-circuits on existing
 * active deal — same EC pattern as createInquiryUseCase).
 *
 * Bounded to a single retry: if the second pass also hits unique
 * violation, something genuinely unusual is happening (concurrent
 * delete + create + delete sequence) and we let the error propagate
 * to surface the bug instead of hiding it behind silent retries.
 *
 * Same retry shape as `createInquiryAction` in I8 (commit `39994cc`).
 */
export async function createDealAction(data: CreateDealDTO): Promise<Deal> {
  const ctx = await getSessionContext()
  try {
    return await createDealUseCase(ctx, contactRepo, dealRepo, data)
  } catch (error) {
    if (isUniqueViolation(error)) {
      return createDealUseCase(ctx, contactRepo, dealRepo, data)
    }
    throw error
  }
}

/**
 * Generic patch on a Deal. Does NOT change `stage` or `stageOrder` —
 * those have dedicated actions (`moveDealStageAction`,
 * `reorderDealsInStageAction`) because the Kanban drag&drop flow needs
 * the recompaction + closed_at/lost_reason side effects that
 * `IDealRepository.moveStage` and `.reorderInStage` provide.
 *
 * Passing `stage` here would bypass that logic — the type allows it
 * (since `UpdateDealDTO` is `Partial<…>`) but the result would leave
 * `stage_order` stale on both the source and destination columns. The
 * use case does not enforce the exclusion at the type level; callers
 * are responsible for routing stage changes through `moveDealStage`.
 */
export async function updateDealAction(
  id: string,
  data: UpdateDealDTO,
): Promise<Deal> {
  const ctx = await getSessionContext()
  return updateDealUseCase(ctx, dealRepo, id, data)
}

/**
 * Move a Deal between Kanban columns, or reposition within the same
 * column when `input.toStage` equals the current stage and
 * `input.toOrder` is set. The repository handles the atomic
 * recompaction of `stage_order` in both source and destination stages.
 *
 * Throw tokens: `deal_not_found`.
 */
export async function moveDealStageAction(
  id: string,
  input: MoveDealStageInput,
): Promise<Deal> {
  const ctx = await getSessionContext()
  return moveDealStageUseCase(ctx, dealRepo, id, input)
}

/**
 * Rewrite `stage_order` for every active Deal in `stage` to match
 * `orderedIds`. Used by Kanban drag&drop within a single column.
 *
 * Throw tokens:
 *   - `reorder_ids_mismatch` — orderedIds does not exactly match the
 *     active Deals currently in `stage` (missing id, unknown id,
 *     wrong stage, or count mismatch)
 *   - `terminal_stage_reorder` — caller invoked with `stage='won'` or
 *     `'lost'` (terminal stages have no Kanban ordering by design)
 */
export async function reorderDealsInStageAction(
  stage: DealStage,
  orderedIds: string[],
): Promise<void> {
  const ctx = await getSessionContext()
  return reorderDealsInStageUseCase(ctx, dealRepo, stage, orderedIds)
}

export async function deleteDealAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deleteDealUseCase(ctx, dealRepo, id)
}

/**
 * Restore a soft-deleted Deal. Throw tokens propagated from the
 * repository (per `restoreDealUseCase` contract):
 *   - `deal_not_found`         — id missing or hidden by RLS
 *   - `deal_already_restored`  — restore() called on a row whose
 *                                `deleted_at IS NULL` (already active)
 *   - `deal_no_permission`     — defensive fallback when the row exists
 *                                but the caller's RLS UPDATE policy
 *                                blocks the restoration (e.g. agent
 *                                trying to restore another agent's
 *                                Deal in the same org)
 *
 * The UI maps each token to a distinct toast in the trash-list
 * component (mirror of `describeInquiryRestoreError` and
 * `describeContactRestoreError` patterns).
 */
export async function restoreDealAction(id: string): Promise<Deal> {
  const ctx = await getSessionContext()
  return restoreDealUseCase(ctx, dealRepo, id)
}
