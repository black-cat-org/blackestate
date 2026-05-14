import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { contact } from "./contact";
import { properties } from "./properties";
import { queueItemStatusEnum } from "./enums";

/**
 * Contact ↔ Property queue — list of properties the bot intends to
 * surface to a Contact, ordered by `sort_order`. The unit of work is
 * the Contact (the person), not a Deal: when the bot picks the next
 * property to suggest, it does so from the Contact's queue regardless
 * of whether any specific Deal exists yet. A Property suggestion that
 * lands successfully (the Contact expresses interest) typically results
 * in an Inquiry being created, which may later be promoted to a Deal.
 *
 * Coexists with the legacy `lead_property_queue` table during the
 * Contact + Inquiry + Deal refactor. The legacy table keeps the existing
 * bot module functional until R35 migrates the bot queue consumer
 * (`features/bot`) to read from this table. The legacy table is dropped
 * in R46 cleanup (Fase 10). Mirror this convention with any other
 * lead-coupled table that needs to migrate gradually.
 *
 * `contact_id` FK uses `onDelete: "cascade"` for the same safety-net
 * policy as Deal / Inquiry: the project enforces "no hard-delete" at
 * the application layer, but if a hard-delete is ever introduced, queue
 * entries belonging to a deleted Contact must not survive — they only
 * make sense alongside their owner Contact. `property_id` also
 * cascades for the symmetric reason.
 */
export const contactPropertyQueue = pgTable(
  "contact_property_queue",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),

    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),

    // Queue state — reuses the existing `queue_item_status` enum
    // (pending / sent / paused). Behaviour unchanged from the legacy
    // table; only the parent reference moves from `lead_id` to
    // `contact_id`.
    status: queueItemStatusEnum("status").notNull().default("pending"),
    sortOrder: integer("sort_order").notNull().default(0),

    estimatedSendAt: timestamp("estimated_send_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),

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
    // Mirror of the property / contact / deal / inquiry soft-delete pattern.
    deletedByUserId: uuid("deleted_by_user_id"),
    deletedByUserName: text("deleted_by_user_name"),
    deletedByUserEmail: text("deleted_by_user_email"),
  },
  (t) => [
    index("cpq_contact_id_idx").on(t.contactId),
    // Property-scoped lookups: bot scheduler bulk-cancels queue entries
    // when a property goes off-market, soft-delete, or is transferred —
    // those flows scan by `property_id`. Mirror of the standalone
    // property indexes on `deal` and `inquiry`.
    index("cpq_property_id_idx").on(t.propertyId),
    index("cpq_org_id_idx").on(t.organizationId),
    index("cpq_contact_sort_idx").on(t.contactId, t.sortOrder),
    index("cpq_org_created_by_idx").on(t.organizationId, t.createdByUserId),
  ],
);

/**
 * Drizzle-inferred row types for the `contact_property_queue` table.
 * Consumed by future infrastructure code that orchestrates the bot's
 * suggestion queue post-refactor.
 *
 * Suffix `Record` is intentional: the domain layer will eventually
 * export a `ContactPropertyQueueItem` interface with a different
 * nullability story (`undefined` for optional fields vs `null` here).
 * Distinct names prevent a callsite from accidentally importing the
 * DB shape where the domain entity is expected.
 */
export type ContactPropertyQueueRecord = typeof contactPropertyQueue.$inferSelect;
export type NewContactPropertyQueueRecord = typeof contactPropertyQueue.$inferInsert;
