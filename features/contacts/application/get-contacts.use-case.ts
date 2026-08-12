import type { Contact } from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * List every non-deleted Contact visible to the caller. Pure delegation
 * — RLS at the repository enforces org scope (and the contact SELECT
 * policy is org-wide so cross-agent dedup works at the UI layer).
 *
 * For the trash view, a separate `get-deleted-contacts.use-case.ts`
 * can be added when the papelera UI lands (R24). Not part of R21 per
 * §4.1 plan enumeration.
 */
export async function getContactsUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
): Promise<Contact[]> {
  return contactRepo.findAll(ctx)
}
