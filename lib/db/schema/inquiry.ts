import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { contact } from "./contact";
import { properties } from "./properties";
import { inquiryStatusEnum, inquirySourceEnum } from "./enums";

/**
 * Inquiry — light expressed interest from a Contact about a Property,
 * without yet committing to a commercial path. Distinct from `deal`
 * (commercial opportunity with a funnel) and from `contact` (the person
 * identity itself).
 *
 * A Contact may have many Inquiries — typically one per Property they
 * ask about. When an Inquiry matures (a visit gets scheduled, the agent
 * moves to negotiation), it is **promoted** to a Deal through an atomic
 * two-row transaction that sets `status = 'promoted'` here and inserts
 * a Deal with `inquiry_id` back-linking to this row. The reverse link
 * lives in `promoted_deal_id`; both sides of the invariant are written
 * inside the same `withRLS` transaction (see `IInquiryRepository.promote`
 * in `features/inquiries/domain/inquiry.repository.ts`).
 *
 * Partial UNIQUE constraint that the dedup hot path relies on is NOT
 * expressed here:
 *   UNIQUE(organization_id, contact_id, property_id)
 *     WHERE deleted_at IS NULL AND status = 'open'
 *
 * Drizzle Kit cannot express partial UNIQUE constraints natively, so it
 * lives in the SQL migration (`drizzle/sql/026_contact_inquiry_deal_refactor.sql`
 * — R12). Do NOT re-add it as a regular `unique(...)` here — that would
 * make the constraint apply to every row including discarded / promoted
 * Inquiries, breaking the "renewed interest" use case (a Contact who
 * was previously discarded or promoted on a Property must be able to
 * open a fresh Inquiry on the same Property).
 *
 * The `promoted_deal_id` foreign key intentionally does NOT use
 * Drizzle's `.references()` — it lives only as a `text` column. The
 * Deal table (`./deal.ts`, R6) has a symmetric back-link (`inquiry_id`)
 * to this table. Declaring both FKs at the TS layer would create a
 * circular import. The actual constraint
 * `FOREIGN KEY (promoted_deal_id) REFERENCES public.deal(id) ON DELETE SET NULL`
 * lives in the R12 SQL migration. **`ON DELETE SET NULL` — not CASCADE
 * — is intentional:** if a Deal is ever hard-deleted, the Inquiry
 * must survive with `promoted_deal_id = NULL` because the historical
 * record of the expressed interest is preserved across the Deal's
 * disappearance (sub-plan EC16). Inverse of the `contact_id` /
 * `property_id` cascade above, where a hard-delete on identity rows
 * legitimately invalidates downstream Inquiries. Postgres handles
 * circular FKs natively; mirror of the `member.user_id → auth.users(id)`
 * convention.
 */
export const inquiry = pgTable(
  "inquiry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),

    // Both FKs declare `onDelete: "cascade"` as the safety-net policy
    // documented in sub-plan §2.1c / EC18: the project enforces a "no
    // hard-delete" rule at the application layer (soft-delete only), but
    // if a hard-delete is ever introduced (admin tooling, GDPR purge,
    // future Inngest job) the cascade prevents dangling FK rows. With
    // soft-delete, `deleted_at IS NOT NULL` does not trigger cascade —
    // these clauses only fire on true DELETE statements. Mirror of the
    // Deal table FK policy (R6).
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),

    // Capture metadata
    source: inquirySourceEnum("source"),
    message: text("message"),

    // Lifecycle
    status: inquiryStatusEnum("status").notNull().default("open"),

    // FK to the resulting Deal when status transitions to 'promoted'.
    // Declared SQL-side only (R12) — see file-level JSDoc above for
    // why this is not a `.references()` call.
    promotedDealId: text("promoted_deal_id"),

    // Optional reason captured when status moves to 'discarded'.
    discardedReason: text("discarded_reason"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // Soft-delete audit columns. The FK
    // `deleted_by_user_id REFERENCES auth.users(id) ON DELETE SET NULL`
    // is managed via SQL migration only — `auth.users` lives outside the
    // public.* Drizzle schema scope, so `.references()` cannot express it.
    // Mirror of the property / contact / deal soft-delete pattern.
    deletedByUserId: uuid("deleted_by_user_id"),
    deletedByUserName: text("deleted_by_user_name"),
    deletedByUserEmail: text("deleted_by_user_email"),
  },
  (t) => [
    index("inquiry_org_id_idx").on(t.organizationId),
    index("inquiry_contact_id_idx").on(t.contactId),
    index("inquiry_property_id_idx").on(t.propertyId),
    index("inquiry_org_status_idx").on(t.organizationId, t.status),
    index("inquiry_org_created_by_idx").on(t.organizationId, t.createdByUserId),
  ],
);

/**
 * Drizzle-inferred row types for the `inquiry` table. Consumed by
 * `features/inquiries/infrastructure/inquiry.model.ts` (I4) and any
 * repository call site that needs the raw DB shape.
 *
 * Suffix `Record` is intentional: the domain layer exports an `Inquiry`
 * interface (`features/inquiries/domain/inquiry.entity.ts`) with a
 * different nullability story (`undefined` for optional fields vs `null`
 * here). Distinct names prevent a callsite from accidentally importing
 * the DB shape where the domain entity is expected.
 */
export type InquiryRecord = typeof inquiry.$inferSelect;
export type NewInquiryRecord = typeof inquiry.$inferInsert;
