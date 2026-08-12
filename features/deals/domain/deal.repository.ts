import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  Deal,
  DealStage,
  CreateDealDTO,
  UpdateDealDTO,
} from "./deal.entity"

/** Input for {@link IDealRepository.moveStage}. */
export interface MoveDealStageInput {
  toStage: DealStage
  /**
   * Zero-based position in the destination column. When omitted, the
   * adapter appends the deal to the bottom (`MAX(stage_order) + 1`).
   */
  toOrder?: number
  /**
   * Optional reason captured when transitioning to `lost`. The adapter
   * persists this on the same UPDATE that sets `stage = 'lost'` and
   * `closed_at = now()`, so the three columns are written atomically.
   *
   * Ignored when `toStage` is not `'lost'` — there is no semantic
   * meaning for the field on `won` (no loss to explain) or on any
   * active stage (no terminal close yet). On reopen (terminal →
   * active), `lost_reason` is always cleared regardless of this
   * field's value, mirroring the existing `closed_at` clear semantics.
   *
   * Kanban drag-and-drop calls leave this `undefined`; the `lost`
   * column drop produces a generic loss without a reason. The
   * `lost-deal-dialog.tsx` (R27) surface captures the reason when the
   * agent uses the explicit "Marcar como perdido" button instead.
   */
  lostReason?: string
}

/**
 * Internal create DTO consumed by the repository after the use case has
 * resolved the Contact. `contactId` is guaranteed to be a real id (existing
 * Contact found via dedup, or a newly created one); `contactDraft` is
 * intentionally excluded from this shape so the adapter cannot act on
 * stale draft data left over from the public `CreateDealDTO`.
 *
 * The `createDealUseCase` (R22) is responsible for resolving the Contact
 * first via the contact repository and then composing this DTO before
 * calling `dealRepo.create`.
 */
export interface ResolvedCreateDealDTO
  extends Omit<CreateDealDTO, "contactId" | "contactDraft"> {
  contactId: string
}

export interface IDealRepository {
  /**
   * Deals visible in the Kanban (non-deleted AND `stage NOT IN ('won','lost')`).
   *
   * "Active" here means something different than in `IPropertyRepository`:
   *   - Property: `findAllActive` filters by publication status (`status='active'`).
   *   - Deal: `findAllActive` filters by funnel position (active = not terminal).
   *
   * The Kanban renders this list grouped by stage and ordered by
   * `stage_order` within each group.
   */
  findAllActive(ctx: SessionContext): Promise<Deal[]>

  /**
   * Deals that reached a terminal stage (`won` or `lost`) and are not
   * soft-deleted. Used by the archive / closed view, NOT the Kanban.
   * Ordered by `closed_at DESC` in the adapter.
   */
  findAllClosed(ctx: SessionContext): Promise<Deal[]>

  /**
   * Soft-deleted Deals (trash view). Ordered by `deleted_at DESC`.
   * Includes both active and closed Deals that the agent moved to trash.
   */
  findAllDeleted(ctx: SessionContext): Promise<Deal[]>

  /** Fetch a single Deal by id, excluding soft-deleted rows. */
  findById(ctx: SessionContext, id: string): Promise<Deal | undefined>

  /**
   * All Deals belonging to a single Contact, including closed ones —
   * powers the "Deals" section of the contact detail page. Soft-deleted
   * excluded. Ordered by `updated_at DESC`.
   */
  findByContactId(ctx: SessionContext, contactId: string): Promise<Deal[]>

  /**
   * All Deals associated with a single Property, including closed ones.
   * Used by the property detail page to show "who is interested in this
   * property". Soft-deleted excluded. Ordered by `updated_at DESC`.
   */
  findByPropertyId(ctx: SessionContext, propertyId: string): Promise<Deal[]>

  /**
   * All Deals currently in a single funnel stage. Used by the Kanban to
   * fetch a single column on demand (e.g. virtualized rendering, lazy
   * column expansion). Ordered by `stage_order ASC`. Soft-deleted excluded.
   *
   * Calling `findByStage(ctx, 'won')` returns closed-won Deals — there is
   * no automatic exclusion of terminal stages here, unlike `findAllActive`.
   */
  findByStage(ctx: SessionContext, stage: DealStage): Promise<Deal[]>

  /**
   * Find the active (non-terminal, non-deleted) Deal for a given
   * Contact+Property pair, if any. Used by the create-deal use case to
   * detect duplicates BEFORE inserting: the unique constraint on
   * `(orgId, contactId, propertyId) WHERE deletedAt IS NULL AND stage NOT
   * IN ('won','lost')` enforces this at the DB level, but querying first
   * lets the UI present "you already have an active Deal on Carlos +
   * Casa A — open it?" instead of surfacing a constraint violation.
   *
   * Closed Deals (`won` / `lost`) on the same pair do NOT block creating a
   * new one — they represent past opportunities; a fresh interest is a
   * fresh Deal.
   */
  findActiveByContactAndProperty(
    ctx: SessionContext,
    contactId: string,
    propertyId: string,
  ): Promise<Deal | undefined>

  /**
   * Insert a new Deal. The caller (use case) MUST resolve the Contact
   * first and pass a {@link ResolvedCreateDealDTO} with `contactId`
   * populated — the repository does not accept `contactDraft` and will
   * not perform find-or-create on the contact.
   */
  create(ctx: SessionContext, data: ResolvedCreateDealDTO): Promise<Deal>

  update(ctx: SessionContext, id: string, data: UpdateDealDTO): Promise<Deal>

  /**
   * Atomically move a Deal between funnel stages, or reposition it within
   * a stage when `input.toStage` equals the current stage and `input.toOrder`
   * is set.
   *
   * The adapter MUST:
   *   - Update `stage` and `stage_order` on the deal.
   *   - Recompact `stage_order` in BOTH the source stage (after removal)
   *     and the destination stage (after insertion) so positions remain a
   *     dense `0..N-1` sequence with no gaps.
   *   - When `input.toStage` is `won` or `lost`, set `closed_at = now()`.
   *   - When moving OUT of a terminal stage back to an active one, clear
   *     BOTH `closed_at` AND `lost_reason` (reopen semantics — the Deal
   *     is once again a live opportunity).
   *   - Run the entire operation inside a single transaction so no
   *     partial state can be observed by concurrent readers.
   */
  moveStage(
    ctx: SessionContext,
    id: string,
    input: MoveDealStageInput,
  ): Promise<Deal>

  /**
   * Rewrite `stage_order` for every Deal currently in `stage` so the
   * positions match the provided `orderedIds` array. Used by the Kanban
   * after a drag-and-drop WITHIN the same column (the agent reordered
   * cards but did not change their stage).
   *
   * Contract:
   *   - `orderedIds` MUST contain every active (non-deleted, non-terminal)
   *     Deal currently in `stage` for the caller's org — same length,
   *     same set of ids, no extras.
   *   - The adapter validates this and throws an error with message
   *     `"reorder_ids_mismatch"` if `orderedIds` does not match exactly
   *     (missing id, unknown id, count mismatch, or any id belonging to
   *     another stage / org / soft-deleted). The use case and Server
   *     Action catch this token to map to a user-facing message.
   *   - Runs in a single transaction.
   *   - Does NOT change `stage` (use `moveStage` for that).
   */
  reorderInStage(
    ctx: SessionContext,
    stage: DealStage,
    orderedIds: string[],
  ): Promise<void>

  softDelete(ctx: SessionContext, id: string): Promise<void>
  restore(ctx: SessionContext, id: string): Promise<Deal>
}
