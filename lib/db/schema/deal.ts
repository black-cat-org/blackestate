import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { contact } from "./contact";
import { properties } from "./properties";
import { dealStageEnum, dealSourceEnum } from "./enums";

/**
 * Deal — commercial opportunity that connects a Contact to a Property
 * through a 5-stage funnel. Distinct from `inquiry` (light interest with
 * no funnel) and from `contact` (the person identity itself).
 *
 * A Deal typically originates by promoting an Inquiry once the agent
 * commits to a visit / negotiation. The `inquiry_id` column links back
 * to the originating Inquiry for traceability and bidirectional
 * navigation; it is `null` when the agent creates a Deal directly
 * without a prior Inquiry (rare admin path).
 *
 * Partial / functional indexes that the active-Kanban hot paths rely on
 * are NOT expressed here:
 *   - `deal_active_org_idx ON (organization_id) WHERE deleted_at IS NULL AND stage NOT IN ('won','lost')`
 *   - `UNIQUE(organization_id, contact_id, property_id) WHERE deleted_at IS NULL AND stage NOT IN ('won','lost')`
 *
 * Drizzle Kit cannot express partial indexes or partial UNIQUE
 * constraints natively, so they live in the SQL migration
 * (`drizzle/sql/026_contact_inquiry_deal_refactor.sql` — R12). Do NOT
 * re-add them as regular `index(...)` / `unique(...)` here, or
 * `drizzle-kit generate` would emit a full index alongside the partial
 * one and bloat write paths. Same convention as the `contact` and
 * `member` schemas — see CLAUDE.md.
 *
 * The `inquiry_id` foreign key intentionally does NOT use Drizzle's
 * `.references()` — it lives only as a `text` column. The Inquiry
 * table (`./inquiry.ts`, I3) has a symmetric back-link
 * (`promoted_deal_id`) to this table. Declaring both FKs at the TS
 * layer would create a circular import. The actual constraint
 * `FOREIGN KEY (inquiry_id) REFERENCES public.inquiry(id) ON DELETE SET NULL`
 * lives in the R12 SQL migration. **`ON DELETE SET NULL` — not CASCADE
 * — is intentional:** if an Inquiry is ever hard-deleted, the Deal
 * must survive with `inquiry_id = NULL` because the commercial
 * opportunity stands on its own beyond its originating Inquiry.
 * Inverse of the `contact_id` / `property_id` cascade above, where a
 * hard-delete on identity rows legitimately invalidates downstream
 * Deals. Postgres handles circular FKs natively; mirror of the
 * cross-schema `member.user_id → auth.users(id)` convention.
 */
export const deal = pgTable(
  "deal",
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
    // these clauses only fire on true DELETE statements.
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),

    // FK to the originating Inquiry. Declared SQL-side only (R12) — see
    // file-level JSDoc above for why this is not a `.references()` call.
    inquiryId: text("inquiry_id"),

    // Funnel
    stage: dealStageEnum("stage").notNull().default("visit_scheduled"),
    stageOrder: integer("stage_order").notNull().default(0),

    // Capture metadata (inherited from the originating Inquiry when
    // promoted; supplied by the agent when the Deal is created directly).
    source: dealSourceEnum("source"),
    budget: text("budget"),
    message: text("message"),
    propertyTypeSought: text("property_type_sought"),
    zoneOfInterest: text("zone_of_interest"),
    wantsOffers: boolean("wants_offers").notNull().default(false),

    // Forecasting / closure
    expectedCloseAt: timestamp("expected_close_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lostReason: text("lost_reason"),

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
    // Mirror of the property / contact / appointment soft-delete pattern.
    deletedByUserId: uuid("deleted_by_user_id"),
    deletedByUserName: text("deleted_by_user_name"),
    deletedByUserEmail: text("deleted_by_user_email"),
  },
  (t) => [
    index("deal_org_id_idx").on(t.organizationId),
    index("deal_property_id_idx").on(t.propertyId),
    index("deal_contact_id_idx").on(t.contactId),
    index("deal_org_stage_idx").on(t.organizationId, t.stage),
    index("deal_org_created_by_idx").on(t.organizationId, t.createdByUserId),
  ],
);

/**
 * Drizzle-inferred row types for the `deal` table. Consumed by
 * `features/deals/infrastructure/deal.model.ts` (R18) and any repository
 * call site that needs the raw DB shape.
 *
 * Suffix `Record` is intentional: the domain layer exports a `Deal`
 * interface (`features/deals/domain/deal.entity.ts`) with a different
 * nullability story (`undefined` for optional fields vs `null` here).
 * Distinct names prevent a callsite from accidentally importing the
 * DB shape where the domain entity is expected.
 */
export type DealRecord = typeof deal.$inferSelect;
export type NewDealRecord = typeof deal.$inferInsert;
