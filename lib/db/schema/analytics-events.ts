import { pgTable, text, uuid, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: uuid("organization_id").notNull(),

  eventType: text("event_type").notNull(), // property_created, lead_received, appointment_booked, deal_won, property_viewed, etc.
  metadata: jsonb("metadata").notNull().default({}), // { propertyId, leadId, source, amount, ... }

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("analytics_org_id_idx").on(t.organizationId),
  index("analytics_event_type_idx").on(t.eventType),
  index("analytics_org_created_idx").on(t.organizationId, t.createdAt),
]);
