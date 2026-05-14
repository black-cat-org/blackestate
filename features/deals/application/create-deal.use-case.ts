import { findOrCreateContactUseCase } from "@/features/contacts/application/find-or-create-contact.use-case"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type {
  CreateDealDTO,
  Deal,
} from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Creates a Deal with dual-mode contact resolution + active-duplicate
 * dedup. Composite use case — mirror of `createInquiryUseCase`, the
 * other capture-flow composer.
 *
 * Resolution priority (when both DTO fields are supplied, `contactId`
 * wins):
 *   1. `data.contactId` → use directly.
 *   2. `data.contactDraft` → resolve via `findOrCreateContactUseCase`.
 *   3. Neither → throw `deal_missing_contact`. Zod at the server-action
 *      boundary should prevent this; the throw is the defensive backstop.
 *
 * Dedup behaviour: if an active (non-terminal, non-deleted) Deal
 * already exists for `(contactId, propertyId)`, return it as-is rather
 * than create a duplicate. The partial UNIQUE on `deal_unique_active_
 * contact_property` (migration 026) enforces this at the DB; querying
 * first lets the caller render the existing Deal without surfacing a
 * 23505 to the UI. Past won/lost Deals on the same pair do NOT block
 * a new active Deal — they represent closed opportunities; renewed
 * commercial interest creates a fresh Deal.
 *
 * Race window: two concurrent calls on the same (contact, property)
 * both miss the `findActiveByContactAndProperty` check and both call
 * create. The second hits the partial UNIQUE in the DB. The server-
 * action layer (R25) catches and re-runs the findActive lookup to
 * surface the winner.
 *
 * Cross-feature Application → Application import is documented as an
 * allowed exception in CLAUDE.md's Import Rules table — every Deal
 * needs a resolved Contact, so the composition expresses a real
 * domain dependency.
 */
export async function createDealUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  dealRepo: IDealRepository,
  data: CreateDealDTO,
): Promise<Deal> {
  // 1. Resolve contact — contactId takes precedence over contactDraft
  let contactId: string
  if (data.contactId) {
    contactId = data.contactId
  } else if (data.contactDraft) {
    const contact = await findOrCreateContactUseCase(
      ctx,
      contactRepo,
      data.contactDraft,
    )
    contactId = contact.id
  } else {
    throw new Error("deal_missing_contact")
  }

  // 2. Dedup — return existing active Deal instead of creating a duplicate.
  //
  // Special case: if this call is promoting an Inquiry (`data.inquiryId`
  // is supplied) and the existing active Deal has no Inquiry link yet
  // (`existing.inquiryId` is undefined), patch the link before returning.
  // Otherwise the Inquiry that triggered this call would be orphaned —
  // it would never be navigable from the Deal funnel back to its origin.
  //
  // When the existing Deal ALREADY has an `inquiryId` (linked to a
  // different Inquiry), we preserve the original attribution — the
  // first Inquiry that opened the Deal stays as the historical
  // origin. The second Inquiry's traceability comes from its own
  // `promotedDealId` once it gets explicitly promoted via the
  // promoteInquiry flow (which uses `inquiryRepo.promote`, not this
  // use case).
  const existing = await dealRepo.findActiveByContactAndProperty(
    ctx,
    contactId,
    data.propertyId,
  )
  if (existing) {
    if (data.inquiryId && !existing.inquiryId) {
      return dealRepo.update(ctx, existing.id, { inquiryId: data.inquiryId })
    }
    return existing
  }

  // 3. Insert new Deal with the resolved contactId
  return dealRepo.create(ctx, {
    contactId,
    propertyId: data.propertyId,
    inquiryId: data.inquiryId,
    stage: data.stage,
    source: data.source,
    budget: data.budget,
    message: data.message,
    propertyTypeSought: data.propertyTypeSought,
    zoneOfInterest: data.zoneOfInterest,
    wantsOffers: data.wantsOffers,
    expectedCloseAt: data.expectedCloseAt,
  })
}
