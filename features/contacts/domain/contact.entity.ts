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
  deletedBy?: {
    userId?: string
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
 * Patch shape for updating an existing contact. All fields optional;
 * fields explicitly set to `undefined` or omitted are not touched.
 * Empty string for phone/email means "clear" — translated to NULL by
 * the mapper (per null-safety convention in CLAUDE.md).
 */
export type UpdateContactDTO = Partial<CreateContactDTO>

export interface ContactFilters {
  search: string
  tag: string | "all"
}
