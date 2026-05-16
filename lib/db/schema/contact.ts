import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Contact — person identity. Distinct from a Deal (commercial opportunity).
 *
 * `phone` / `email` are nullable: not every contact captured by the agent
 * has both at intake time (walk-in, partial public form, WhatsApp first
 * message). The dedup pivots on `(organization_id, phone)` and
 * `(organization_id, lower(email))` but is enforced in the use case
 * layer, NOT via UNIQUE constraints — phone/email can be NULL, can
 * change, and family-shared phones are a legitimate case.
 *
 * Partial / functional indexes used by the dedup and active list hot
 * paths are NOT expressed here:
 *   - `contact_org_phone_idx ON (organization_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL`
 *   - `contact_org_email_idx ON (organization_id, lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL`
 *   - `contact_active_org_idx ON (organization_id) WHERE deleted_at IS NULL`
 *
 * Drizzle Kit cannot express partial / functional indexes natively, so
 * they live in the SQL migration
 * (`drizzle/sql/026_contact_inquiry_deal_refactor.sql`, created in R12).
 * Do NOT re-add them as regular `index(...)` here —
 * `drizzle-kit generate` would emit a full index alongside the partial
 * one and bloat write paths. The pattern mirrors the `member` schema
 * (see `member.ts`).
 *
 * Web tracking of property visits lives in a separate table
 * (`contact_property_visits`, R5b) — NOT as a JSONB array on this row.
 * The split lets us answer "everyone who visited Casa A this week"
 * with a native index instead of unnesting JSON on every read.
 */
export const contact = pgTable(
  "contact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),

    // Identity
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    tags: text("tags").array().notNull().default([]),
    preferredChannel: text("preferred_channel"),

    // Catalog tracking — preserved from the legacy `lead` row.
    catalogSentWithOrigin: boolean("catalog_sent_with_origin")
      .notNull()
      .default(false),
    catalogOpenedAt: timestamp("catalog_opened_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // Soft-delete audit columns. Populated by repository.softDelete (R17).
    // The FK `deleted_by_user_id REFERENCES auth.users(id) ON DELETE SET NULL`
    // is managed via SQL migration only — `auth.users` lives outside the
    // public.* Drizzle schema scope, so .references() cannot express it.
    // Mirror of the property / appointment soft-delete pattern.
    deletedByUserId: uuid("deleted_by_user_id"),
    deletedByUserName: text("deleted_by_user_name"),
    deletedByUserEmail: text("deleted_by_user_email"),
  },
  (t) => [
    index("contact_org_id_idx").on(t.organizationId),
    index("contact_org_created_by_idx").on(t.organizationId, t.createdByUserId),
  ],
);
