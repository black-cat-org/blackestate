import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const aiContents = pgTable("ai_contents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  propertyId: text("property_id").notNull(),

  type: text("type").notNull(), // descripcion, caption, hashtags, brochure
  platform: text("platform"), // facebook, instagram, tiktok, whatsapp (null for descripcion/hashtags)
  text: text("text").notNull(),

  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedTo: text("published_to"), // platform where it was published

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("ai_contents_org_id_idx").on(t.organizationId),
  index("ai_contents_property_id_idx").on(t.propertyId),
]);
