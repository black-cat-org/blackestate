import type { Contact } from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Restore a soft-deleted Contact (papelera → active). Clears
 * `deleted_at` and the audit snapshot columns.
 *
 * Throw tokens surfaced by the repository (see
 * `drizzle-contact.repository.ts` JSDoc): `CONTACT_NOT_FOUND`,
 * `CONTACT_ALREADY_RESTORED`, `CONTACT_NO_PERMISSION`. The server
 * action layer maps these to localised Spanish messages at the
 * presentation boundary.
 */
export async function restoreContactUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  id: string,
): Promise<Contact> {
  return contactRepo.restore(ctx, id)
}
