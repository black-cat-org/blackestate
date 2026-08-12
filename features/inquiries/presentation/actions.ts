"use server"

import { DrizzleContactRepository } from "@/features/contacts/infrastructure/drizzle-contact.repository"
import type { Deal } from "@/features/deals/domain/deal.entity"
import { createInquiryUseCase } from "@/features/inquiries/application/create-inquiry.use-case"
import { deleteInquiryUseCase } from "@/features/inquiries/application/delete-inquiry.use-case"
import { discardInquiryUseCase } from "@/features/inquiries/application/discard-inquiry.use-case"
import { getArchivedInquiriesUseCase } from "@/features/inquiries/application/get-archived-inquiries.use-case"
import { getDeletedInquiriesUseCase } from "@/features/inquiries/application/get-deleted-inquiries.use-case"
import { getInquiriesByContactUseCase } from "@/features/inquiries/application/get-inquiries-by-contact.use-case"
import { getInquiriesByPropertyUseCase } from "@/features/inquiries/application/get-inquiries-by-property.use-case"
import { getInquiriesUseCase } from "@/features/inquiries/application/get-inquiries.use-case"
import { getInquiryByIdUseCase } from "@/features/inquiries/application/get-inquiry-by-id.use-case"
import { getOpenInquiriesUseCase } from "@/features/inquiries/application/get-open-inquiries.use-case"
import { promoteInquiryUseCase } from "@/features/inquiries/application/promote-inquiry.use-case"
import { restoreInquiryUseCase } from "@/features/inquiries/application/restore-inquiry.use-case"
import type {
  CreateInquiryDTO,
  Inquiry,
} from "@/features/inquiries/domain/inquiry.entity"
import type {
  FindInquiriesOptions,
  PromoteInquiryDealInput,
} from "@/features/inquiries/domain/inquiry.repository"
import { DrizzleInquiryRepository } from "@/features/inquiries/infrastructure/drizzle-inquiry.repository"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { isUniqueViolation } from "@/lib/utils/pg-errors"

// Module-level singletons. The Drizzle adapters are stateless — every
// query opens its own `withRLS` transaction with the per-call
// SessionContext — so a single instance is reusable across the
// process's request lifetime. Repositories are constructed here at the
// presentation boundary, NOT in the use cases (Clean Architecture:
// Application never imports Infrastructure).
//
// Two repos coexist here because `createInquiryAction` needs both:
// `createInquiryUseCase` resolves the Contact (via `findOrCreateContact`
// when the form sent `contactDraft`) AND inserts the Inquiry. The use
// case lives in `features/inquiries/application/` and receives both
// repos as parameters, which is the documented App→App cross-feature
// exception in CLAUDE.md (every Inquiry needs a resolved Contact —
// genuine domain coupling, not implementation leak).
const contactRepo = new DrizzleContactRepository()
const inquiryRepo = new DrizzleInquiryRepository()

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getInquiriesAction(
  options?: FindInquiriesOptions,
): Promise<Inquiry[]> {
  const ctx = await getSessionContext()
  return getInquiriesUseCase(ctx, inquiryRepo, options)
}

export async function getOpenInquiriesAction(): Promise<Inquiry[]> {
  const ctx = await getSessionContext()
  return getOpenInquiriesUseCase(ctx, inquiryRepo)
}

export async function getArchivedInquiriesAction(): Promise<Inquiry[]> {
  const ctx = await getSessionContext()
  return getArchivedInquiriesUseCase(ctx, inquiryRepo)
}

export async function getDeletedInquiriesAction(): Promise<Inquiry[]> {
  const ctx = await getSessionContext()
  return getDeletedInquiriesUseCase(ctx, inquiryRepo)
}

export async function getInquiryByIdAction(
  id: string,
): Promise<Inquiry | undefined> {
  const ctx = await getSessionContext()
  return getInquiryByIdUseCase(ctx, inquiryRepo, id)
}

export async function getInquiriesByContactAction(
  contactId: string,
): Promise<Inquiry[]> {
  const ctx = await getSessionContext()
  return getInquiriesByContactUseCase(ctx, inquiryRepo, contactId)
}

export async function getInquiriesByPropertyAction(
  propertyId: string,
): Promise<Inquiry[]> {
  const ctx = await getSessionContext()
  return getInquiriesByPropertyUseCase(ctx, inquiryRepo, propertyId)
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create an Inquiry, handling the EC8 race window between the use
 * case's `findOpenByContactAndProperty` check and the actual INSERT.
 *
 * Scenario: two agents (or the bot + an agent) submit the same
 * (contact, property) at the same time. Both check `findOpen` → miss
 * → both INSERT. Postgres's partial UNIQUE
 * `inquiry_unique_open_contact_property` (migration 026) raises 23505
 * on the loser. Without a retry, the loser surfaces a raw PG error.
 *
 * Strategy: catch unique violation, re-run the use case once. The
 * second pass's `findOpen` will now see the winner's row and
 * reactivate it (returning the existing Inquiry), so the caller sees
 * the same outcome regardless of which call won the race.
 *
 * Bounded to a single retry: if the second pass also hits a unique
 * violation, something is genuinely wrong (e.g. concurrent discard
 * + create + discard sequence) and we let the error propagate to the
 * caller so the bug is not hidden behind silent retries.
 */
export async function createInquiryAction(
  data: CreateInquiryDTO,
): Promise<Inquiry> {
  const ctx = await getSessionContext()
  try {
    return await createInquiryUseCase(ctx, contactRepo, inquiryRepo, data)
  } catch (error) {
    if (isUniqueViolation(error)) {
      return createInquiryUseCase(ctx, contactRepo, inquiryRepo, data)
    }
    throw error
  }
}

export async function discardInquiryAction(
  id: string,
  reason?: string,
): Promise<Inquiry> {
  const ctx = await getSessionContext()
  return discardInquiryUseCase(ctx, inquiryRepo, id, reason)
}

/**
 * Promote an Inquiry to a Deal atomically. Returns BOTH the new Deal
 * and the updated Inquiry so the UI can render "Negocio creado desde
 * la consulta de Carlos sobre Casa A" + navigate to the Deal detail
 * without a second roundtrip.
 *
 * The atomicity (insert deal + flip inquiry status + back-link both
 * sides) lives in `IInquiryRepository.promote()` — the use case is a
 * thin delegate (sub-plan §4.4).
 */
export async function promoteInquiryAction(
  id: string,
  dealInput: PromoteInquiryDealInput,
): Promise<{ deal: Deal; inquiry: Inquiry }> {
  const ctx = await getSessionContext()
  return promoteInquiryUseCase(ctx, inquiryRepo, id, dealInput)
}

export async function deleteInquiryAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deleteInquiryUseCase(ctx, inquiryRepo, id)
}

export async function restoreInquiryAction(id: string): Promise<Inquiry> {
  const ctx = await getSessionContext()
  return restoreInquiryUseCase(ctx, inquiryRepo, id)
}
