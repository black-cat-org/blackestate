import type { Contact } from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Restore a soft-deleted Contact (papelera → active). Clears
 * `deleted_at` and the audit snapshot columns.
 *
 * Throw tokens surfaced by the repository (see
 * `drizzle-contact.repository.ts` JSDoc): `contact_not_found`,
 * `contact_already_restored`, `contact_no_permission`, plus
 * `contact_not_found_or_no_permission` as a defensive fallback when
 * the caller can SELECT the deleted row but fails the
 * `contact_update_restore` RLS policy on the UPDATE. The server
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
