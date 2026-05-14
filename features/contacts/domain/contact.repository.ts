import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Contact, CreateContactDTO, UpdateContactDTO } from "./contact.entity"

/**
 * Options for `searchByQuery`.
 *
 * Designed to be extensible: future filters (tag, source, etc.) land here
 * as optional fields without breaking existing callers.
 */
export interface ContactSearchOptions {
  /** @default 10 — sized for autocomplete UX (Deal creation form, contact picker). */
  limit?: number
}

export interface IContactRepository {
  /**
   * List every non-deleted contact in the caller's org. Soft-deleted
   * contacts are excluded — use `findAllDeleted` for the trash view.
   *
   * Unlike `IPropertyRepository`, this repo does NOT expose a separate
   * `findAllActive` method: contacts have no publication status that would
   * make "active" mean anything beyond "not soft-deleted". The two would
   * collapse to the same query.
   */
  findAll(ctx: SessionContext): Promise<Contact[]>

  /**
   * List soft-deleted contacts in the caller's org (trash view).
   * Used by the papelera UI; ordered by `deleted_at DESC` in the adapter.
   */
  findAllDeleted(ctx: SessionContext): Promise<Contact[]>

  /** Fetch a single contact by id, excluding soft-deleted rows. */
  findById(ctx: SessionContext, id: string): Promise<Contact | undefined>

  /**
   * Find a single contact whose phone OR email matches the provided values.
   * Used by the find-or-create flow to deduplicate contacts at capture time
   * (Deal creation, public landing form, WhatsApp bot intake).
   *
   * Matching rules:
   *   - `phone` matched against the contact's stored phone after both sides
   *     are normalised (digits + leading `+` only).
   *   - `email` matched case-insensitively against the contact's stored email.
   *   - If both `phone` and `email` are provided, returns a contact that
   *     matches EITHER (more lenient — survives the case where a person
   *     updates their email but keeps the same number, or vice versa).
   *   - If both are `undefined` / empty after normalisation, returns
   *     `undefined` without querying.
   *
   * Soft-deleted contacts are excluded. If the only matching row is
   * soft-deleted, this returns `undefined` and the `find-or-create-contact`
   * use case is responsible for treating that as a "create new contact"
   * branch (a future enhancement may detect the gap explicitly and offer
   * a restore UX, but that is out of scope for the initial implementation).
   *
   * When multiple active candidates match (e.g. two contacts share a family
   * phone, or a stale duplicate exists), the implementation returns the most
   * recently updated active contact. The UI still lets the agent override
   * by creating a new contact explicitly if the suggestion is wrong.
   */
  findByPhoneOrEmail(
    ctx: SessionContext,
    phone?: string,
    email?: string,
  ): Promise<Contact | undefined>

  /**
   * Free-text search across `name`, `phone`, and `email` for the autocomplete
   * in the Deal creation dialog and contact picker.
   *
   * `notes` is intentionally NOT searched — it is free-form and would
   * surface noisy results for short autocomplete queries (e.g. "Car"
   * matching every contact whose notes mention "car"). The autocomplete
   * targets identity fields only.
   *
   * Implementation contract for the Drizzle adapter:
   *   - Match `ILIKE %query%` across the three identity columns.
   *   - Exclude soft-deleted contacts.
   *   - Order by `updated_at DESC` so the most active contacts surface first.
   *   - Cap by `options.limit` (default 10).
   *   - Empty / whitespace-only `query` returns an empty array without
   *     querying (avoids a full-table scan via `ILIKE '%%'`).
   */
  searchByQuery(
    ctx: SessionContext,
    query: string,
    options?: ContactSearchOptions,
  ): Promise<Contact[]>

  create(ctx: SessionContext, data: CreateContactDTO): Promise<Contact>
  update(ctx: SessionContext, id: string, data: UpdateContactDTO): Promise<Contact>
  softDelete(ctx: SessionContext, id: string): Promise<void>
  restore(ctx: SessionContext, id: string): Promise<Contact>
}
