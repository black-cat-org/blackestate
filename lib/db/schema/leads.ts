import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { properties } from "./properties";
import { leadStatusEnum, leadSourceEnum } from "./enums";

export const leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),

  // Contact info
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),

  // Lead details
  source: leadSourceEnum("source"),
  status: leadStatusEnum("status").notNull().default("new"),
  message: text("message"),

  // Preferences
  propertyTypeSought: text("property_type_sought"),
  budget: text("budget"),
  zoneOfInterest: text("zone_of_interest"),
  wantsOffers: boolean("wants_offers").notNull().default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("leads_org_id_idx").on(t.organizationId),
  index("leads_property_id_idx").on(t.propertyId),
  index("leads_status_idx").on(t.status),
  index("leads_org_status_idx").on(t.organizationId, t.status),
]);
