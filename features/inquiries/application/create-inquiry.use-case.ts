import { findOrCreateContactUseCase } from "@/features/contacts/application/find-or-create-contact.use-case"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type {
  CreateInquiryDTO,
  Inquiry,
} from "@/features/inquiries/domain/inquiry.entity"
import type { IInquiryRepository } from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Creates an Inquiry with dual-mode contact resolution + EC8
 * reactivation. The only composite use case in the inquiry application
 * layer — every other inquiry use case is a thin repo delegate.
 *
 * Resolution priority (when both DTO fields are supplied, `contactId`
 * wins — the caller's explicit reference outranks the draft inputs):
 *   1. `data.contactId` → use directly.
 *   2. `data.contactDraft` → resolve via `findOrCreateContactUseCase`
 *      (dedup against existing or create new).
 *   3. Neither → throw `inquiry_missing_contact`. Zod at the server-
 *      action boundary should make this unreachable; the throw is a
 *      defensive backstop so the failure mode is a domain token, not
 *      a SQL NOT NULL violation deep in the insert.
 *
 * EC8 reactivation (sub-plan §7): if an open Inquiry already exists
 * for `(contactId, propertyId)`, return it as-is instead of creating
 * a duplicate. Renewed interest after a previous Inquiry was
 * discarded or promoted DOES create a fresh open Inquiry — the
 * partial UNIQUE constraint in migration 026 only blocks duplicate
 * `open` rows on the same pair.
 *
 * Race window: two concurrent calls with the same `(contact, property)`
 * may both miss the `findOpenByContactAndProperty` check and both
 * call `create`. The second hits the partial UNIQUE in the DB (PG
 * 23505). The server-action layer (I8) is responsible for catching
 * that and re-running the findOpen lookup to surface the winner.
 *
 * Clean Architecture note: this is a cross-feature Application →
 * Application import (`findOrCreateContactUseCase` lives in
 * `features/contacts/application/`). Both files are pure functions
 * with no Infrastructure dependencies; the composition expresses a
 * real business dependency (every Inquiry needs a resolved Contact),
 * so the coupling is genuine rather than incidental.
 */
export async function createInquiryUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  inquiryRepo: IInquiryRepository,
  data: CreateInquiryDTO,
): Promise<Inquiry> {
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
    throw new Error("inquiry_missing_contact")
  }

  // 2. EC8 — reactivate existing open inquiry instead of duplicating
  const existing = await inquiryRepo.findOpenByContactAndProperty(
    ctx,
    contactId,
    data.propertyId,
  )
  if (existing) return existing

  // 3. Insert new inquiry with the resolved contactId
  return inquiryRepo.create(ctx, {
    contactId,
    propertyId: data.propertyId,
    source: data.source,
    message: data.message,
  })
}
