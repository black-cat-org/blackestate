import type {
  Contact,
  UpdateContactDTO,
} from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Patch an existing Contact. The mapper applies the "include key with
 * undefined to clear" idiom on nullable fields (phone, email, notes,
 * preferredChannel) and the canonicalisation on phone/email — see
 * `contact.mapper.ts` JSDoc.
 *
 * Authorisation: the repository's `contact_update_role_aware` policy
 * (migration 026) restricts the UPDATE to owner/admin OR
 * `created_by_user_id = auth.uid()`. An agent editing another agent's
 * contact receives `CONTACT_NOT_FOUND_OR_NO_PERMISSION` — generic by
 * design so existence is not leaked.
 */
export async function updateContactUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  id: string,
  data: UpdateContactDTO,
): Promise<Contact> {
  return contactRepo.update(ctx, id, data)
}
