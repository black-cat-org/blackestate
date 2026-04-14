import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { properties } from "./properties";
import { aiContentTypeEnum, aiPlatformEnum } from "./enums";

export const aiContents = pgTable("ai_contents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),

  type: aiContentTypeEnum("type").notNull(),
  platform: aiPlatformEnum("platform"),
  text: text("text").notNull(),

  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedTo: aiPlatformEnum("published_to"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("ai_contents_org_id_idx").on(t.organizationId),
  index("ai_contents_property_id_idx").on(t.propertyId),
]);
