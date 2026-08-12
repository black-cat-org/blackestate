import type {
  Contact,
  ContactPreferredChannel,
  CreateContactDTO,
  UpdateContactDTO,
} from "@/features/contacts/domain/contact.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { ContactInsert, ContactRow } from "./contact.model"

// ---------------------------------------------------------------------------
// Internal: preferred-channel validation
// ---------------------------------------------------------------------------
//
// `preferred_channel` is stored as `text` in Postgres with no CHECK
// constraint, so a write path that bypasses the Zod validation at the
// server-action boundary (manual SQL, legacy migration, a future code
// path that forgets the validator) could persist a value outside the
// `ContactPreferredChannel` union. A naive `as ContactPreferredChannel`
// cast would propagate that invalid string silently into the domain and
// break every consumer that switches on the union — exactly the silent
// failure the project's "no silent failures" rule forbids.
//
// This whitelist is the runtime guard: any DB value outside the set
// becomes `undefined` (field absent) at the domain boundary. Adding a
// new channel requires updating BOTH the type union in `contact.entity`
// AND this set — kept side-by-side in the codebase so a missed update
// fails immediately in tsc rather than masquerading as a silent passthrough.

const PREFERRED_CHANNEL_VALUES = new Set<ContactPreferredChannel>([
  "whatsapp",
  "phone",
  "email",
])

function toPreferredChannel(
  raw: string | null,
): ContactPreferredChannel | undefined {
  if (raw === null) return undefined
  return PREFERRED_CHANNEL_VALUES.has(raw as ContactPreferredChannel)
    ? (raw as ContactPreferredChannel)
    : undefined
}

// ---------------------------------------------------------------------------
// Phone / email canonicalisation
// ---------------------------------------------------------------------------
//
// Contacts are deduplicated against `(organization_id, phone)` and
// `(organization_id, lower(email))` partial indexes from migration 026.
// For the indexes to be hit, stored values must already be in canonical
// form — same regex/transform as §3 of the migration script that produced
// the legacy lead → contact mapping. The repository's `findByPhoneOrEmail`
// uses the same helpers on incoming query inputs so write and read agree
// byte-for-byte on what "the same phone" or "the same email" means.
//
// `normalizeContactPhone`: strips every character that is not a digit
//   or a leading `+`. "+591 712-3456" → "+5917123456". Empty / all-junk
//   inputs collapse to `null` (no false-positive matches against other
//   contacts with empty phones).
//
// `normalizeContactEmail`: lowercases + trims surrounding whitespace.
//   "  Foo@Bar.com " → "foo@bar.com". Empty after trim collapses to
//   `null`.

const PHONE_NON_CANONICAL = /[^0-9+]/g

export function normalizeContactPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const cleaned = raw.replace(PHONE_NON_CANONICAL, "")
  return cleaned.length > 0 ? cleaned : null
}

export function normalizeContactEmail(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const cleaned = raw.trim().toLowerCase()
  return cleaned.length > 0 ? cleaned : null
}

// ---------------------------------------------------------------------------
// Model (DB row, uses null) → Entity (domain, uses undefined)
// ---------------------------------------------------------------------------

export function mapContactRowToEntity(row: ContactRow): Contact {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags,
    preferredChannel: toPreferredChannel(row.preferredChannel),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString(),
    deletedBy: row.deletedByUserId
      ? {
          userId: row.deletedByUserId,
          userName: row.deletedByUserName ?? undefined,
          userEmail: row.deletedByUserEmail ?? undefined,
        }
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// Row + joined counts → Entity
// ---------------------------------------------------------------------------
//
// Use this variant when the caller has materialised `activeInquiriesCount`
// and `lastInquiryAt` via a SQL JOIN/aggregate against `inquiry`. The
// pure `mapContactRowToEntity` leaves both fields `undefined`, signalling
// "not loaded" — consumers must check with `?.` before rendering.

export function mapContactRowWithCountsToEntity(
  row: ContactRow,
  activeInquiriesCount: number | undefined,
  lastInquiryAt: Date | undefined,
): Contact {
  return {
    ...mapContactRowToEntity(row),
    activeInquiriesCount,
    lastInquiryAt: lastInquiryAt?.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// CreateContactDTO → Insert (entity-undefined → DB-null at write time)
// ---------------------------------------------------------------------------

export function mapCreateDTOToInsert(
  data: CreateContactDTO,
  ctx: SessionContext,
): ContactInsert {
  return {
    organizationId: ctx.orgId,
    createdByUserId: ctx.userId,
    name: data.name,
    // Phone and email are stored in canonical form so the partial /
    // functional indexes from migration 026 (`contact_org_phone_idx` and
    // `contact_org_email_idx`) are hit by repository dedup queries.
    phone: normalizeContactPhone(data.phone),
    email: normalizeContactEmail(data.email),
    notes: data.notes ?? null,
    tags: data.tags ?? [],
    preferredChannel: data.preferredChannel ?? null,
    // `id`, `createdAt`, `updatedAt`, `catalogSentWithOrigin`, and
    // `catalogOpenedAt` are intentionally omitted — Drizzle's `$defaultFn`
    // (uuid) and the DB column defaults (`now()`, `false`, `null`) apply.
    // Surfacing them here would couple the mapper to DDL details that
    // legitimately belong to the schema.
  }
}

// ---------------------------------------------------------------------------
// UpdateContactDTO → partial DB update record
// ---------------------------------------------------------------------------

export function mapPartialDTOToUpdate(
  data: UpdateContactDTO,
): Record<string, unknown> {
  const update: Record<string, unknown> = {}

  // `name` and `tags` are NOT NULL in the DB. They can only be patched
  // to a new non-null value or left alone — never "cleared". The
  // `!== undefined` guard matches both contracts.
  if (data.name !== undefined) update.name = data.name
  if (data.tags !== undefined) update.tags = data.tags

  // Optional/clearable fields use the `'key' in data` idiom so an
  // explicit `undefined` from the form means "clear" (write null) and
  // absence means "leave unchanged". Without this discipline, agents
  // cannot un-set a once-set phone/email/notes — correcting a capture
  // mistake becomes impossible from the UI.
  //
  // Phone and email pass through the canonicalisation helpers so the
  // dedup invariants (partial indexes from migration 026, `findByPhoneOrEmail`
  // contract) hold across UPDATE paths too — not just at create time.
  if ("phone" in data) update.phone = normalizeContactPhone(data.phone)
  if ("email" in data) update.email = normalizeContactEmail(data.email)
  if ("notes" in data) update.notes = data.notes ?? null
  if ("preferredChannel" in data)
    update.preferredChannel = data.preferredChannel ?? null

  return update
}
