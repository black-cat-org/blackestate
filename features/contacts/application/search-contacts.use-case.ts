import type { Contact } from "@/features/contacts/domain/contact.entity"
import type {
  ContactSearchOptions,
  IContactRepository,
} from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Free-text autocomplete search over `name`, `phone`, and `email`.
 * Empty / whitespace-only `query` short-circuits to an empty array
 * inside the repository (no full-table scan).
 *
 * Used by:
 *   - Deal-creation contact picker (Kanban + detail page).
 *   - Inquiry-creation contact picker.
 *   - Future global search bar (post-MVP).
 */
export async function searchContactsUseCase(
  ctx: SessionContext,
  contactRepo: IContactRepository,
  query: string,
  options?: ContactSearchOptions,
): Promise<Contact[]> {
  return contactRepo.searchByQuery(ctx, query, options)
}
