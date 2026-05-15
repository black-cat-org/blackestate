import { pgTable, text, uuid, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { properties } from "./properties";
import { aiContentTypeEnum, aiPlatformEnum } from "./enums";

export const aiContents = pgTable("ai_contents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: uuid("organization_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),

  type: aiContentTypeEnum("type").notNull(),
  platform: aiPlatformEnum("platform"),
  text: text("text").notNull(),

  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedTo: aiPlatformEnum("published_to"),

  // Engagement metrics surfaced by the source platform after publish.
  // Loose schema (views/likes/comments/shares/clicks all optional
  // numbers) — JSONB instead of dedicated columns because (a) the
  // shape may evolve as platforms expose new metrics, (b) we never
  // query against individual metric values, only read them as a
  // whole when rendering the content card. R38d ADD COLUMN.
  analytics: jsonb("analytics"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: uuid("deleted_by_user_id"),
  deletedByUserName: text("deleted_by_user_name"),
  deletedByUserEmail: text("deleted_by_user_email"),
}, (t) => [
  index("ai_contents_org_id_idx").on(t.organizationId),
  index("ai_contents_property_id_idx").on(t.propertyId),
  index("ai_contents_org_created_by_idx").on(t.organizationId, t.createdByUserId),
]);
