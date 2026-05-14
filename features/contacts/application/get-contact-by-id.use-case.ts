import type { Contact } from "@/features/contacts/domain/contact.entity"
import type { IContactRepository } from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Fetch a single non-deleted Contact. Returns `undefined` if the row
 * does not exist or RLS hides it from the caller. Use cases /
 * components that need a not-found surface throw at the caller layer
 * (the use case has no opinion on whether absence is an error — it is
 * domain state).
 */
export async function getContactByIdUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  id: string,
): Promise<Contact | undefined> {
  return contactRepo.findById(ctx, id)
}
