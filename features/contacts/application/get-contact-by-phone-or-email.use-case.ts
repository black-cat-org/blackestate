import type { Contact } from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Lookup-only counterpart of `findOrCreateContact` — returns the
 * matching Contact (or `undefined`) without falling through to creation.
 * Used by the Deal-creation autocomplete to suggest "did you mean this
 * existing contact?" before the agent submits a new contact draft.
 *
 * Repository handles the canonicalisation (phone digits + `+`, email
 * lowercased + trimmed) so the lookup hits the partial / functional
 * indexes from migration 026.
 */
export async function getContactByPhoneOrEmailUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  phone?: string,
  email?: string,
): Promise<Contact | undefined> {
  return contactRepo.findByPhoneOrEmail(ctx, phone, email)
}
