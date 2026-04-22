import { pgTable, text, uuid, integer, timestamp, index } from "drizzle-orm/pg-core";

export const propertyTransfers = pgTable("property_transfers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: uuid("organization_id").notNull(),
  fromUserId: uuid("from_user_id").notNull(),
  toUserId: uuid("to_user_id").notNull(),
  transferredByUserId: uuid("transferred_by_user_id").notNull(),

  propertyIds: text("property_ids").array().notNull(),
  leadsCount: integer("leads_count").notNull().default(0),
  appointmentsCount: integer("appointments_count").notNull().default(0),
  aiContentsCount: integer("ai_contents_count").notNull().default(0),
  queueItemsCount: integer("queue_items_count").notNull().default(0),

  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("transfers_org_id_idx").on(t.organizationId),
  index("transfers_to_user_idx").on(t.toUserId),
  index("transfers_from_user_idx").on(t.fromUserId),
]);
