import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const leadPropertyQueue = pgTable("lead_property_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  leadId: text("lead_id").notNull(),
  propertyId: text("property_id").notNull(),

  status: text("status").notNull().default("pendiente"), // pendiente, enviada, pausada
  sortOrder: integer("sort_order").notNull().default(0),

  estimatedSendAt: timestamp("estimated_send_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("lpq_lead_id_idx").on(t.leadId),
  index("lpq_org_id_idx").on(t.organizationId),
]);
