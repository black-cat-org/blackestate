import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  propertyId: text("property_id").notNull(),

  // Contact info
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),

  // Lead details
  source: text("source"), // facebook, instagram, whatsapp, tiktok, null (directo)
  status: text("status").notNull().default("nuevo"), // nuevo, contactado, interesado, ganado, perdido, descartado
  message: text("message"),

  // Preferences
  propertyTypeSought: text("property_type_sought"),
  budget: text("budget"),
  zoneOfInterest: text("zone_of_interest"),
  wantsOffers: boolean("wants_offers").notNull().default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
