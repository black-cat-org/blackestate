export type ContactPreferredChannel = "whatsapp" | "phone" | "email"

/**
 * A Contact represents a real person who interacts with the agency —
 * the identity layer in the Contact ↔ Inquiry split.
 *
 * Logical uniqueness by `(organizationId, phone)` and `(organizationId, email)`
 * is NOT enforced by a UNIQUE constraint: phone/email can be NULL, can
 * change, and a shared family phone can legitimately belong to more than
 * one contact. Deduplication is handled in use cases.
 */
export interface Contact {
  id: string
  createdByUserId: string
  name: string
  phone?: string
  email?: string
  notes?: string
  tags: string[]
  preferredChannel?: ContactPreferredChannel
  createdAt: string
  updatedAt: string
  deletedAt?: string
  // When `deletedBy` is present, the deleting user is identified by
  // `userId` — that field is never absent. `userName`/`userEmail` are
  // denormalised snapshots that may be missing for older soft-deletes
  // (pre soft-delete-audit migration). This shape encodes the actual
  // invariant the mapper produces and prevents consumers from defensive
  // checks on a value that cannot be undefined here.
  deletedBy?: {
    userId: string
    userName?: string
    userEmail?: string
  }

  // Derived / joined fields populated by infrastructure queries when
  // the consumer needs them. Repos that return Contact lists in contexts
  // where these are useful (e.g. /dashboard/contacts) JOIN against
  // inquiry/appointment/bot_conversation to compute them; queries that
  // do not need them leave both undefined.
  activeInquiriesCount?: number
  lastInquiryAt?: string
}

/**
 * Payload to create a new contact. `tags` defaults to empty array at the
 * mapper boundary so callers can omit it; the entity always exposes
 * `tags: string[]` (never undefined) to consumers.
 */
export interface CreateContactDTO {
  name: string
  phone?: string
  email?: string
  notes?: string
  tags?: string[]
  preferredChannel?: ContactPreferredChannel
}

/**
 * Patch shape for updating an existing contact.
 *
 * Update semantics (matches the mapper's `'key' in data` idiom):
 *   - **Omit the key**: leave the column untouched.
 *   - **Include the key with a value**: write that value.
 *   - **Include the key with `undefined`**: clear the column to NULL
 *     (for nullable columns: `phone`, `email`, `notes`, `preferredChannel`).
 *     For `name` and `tags` (NOT NULL), an explicit `undefined` is a
 *     no-op — the mapper's `!== undefined` guard ignores them.
 *
 * Form-side clearing: any UI that wants to clear `phone`/`email` must
 * send `{ phone: undefined }` in the DTO (e.g. coerce empty input strings
 * to `undefined` at the Zod boundary). The mapper does NOT distinguish
 * `"" ` from `undefined` once they reach it — `normalizeContactPhone("")`
 * and `normalizeContactPhone(undefined)` both collapse to `null`. The
 * DTO type stays `string | undefined` to keep the contract narrow.
 */
export type UpdateContactDTO = Partial<CreateContactDTO>

export interface ContactFilters {
  search: string
  tag: string | "all"
}
