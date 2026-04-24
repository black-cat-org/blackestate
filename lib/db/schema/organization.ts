import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { organizationPlanEnum } from "./enums";

/**
 * Tenant root. Every domain row references one organization.
 *
 * Created via trigger `handle_new_user` at sign-up. A user owns exactly one
 * organization; additional memberships are acquired via invitation only.
 */
export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logoUrl: text("logo_url"),
    plan: organizationPlanEnum("plan").notNull().default("free"),
    maxSeats: integer("max_seats").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    deletedAtIdx: index("organization_deleted_at_idx").on(table.deletedAt),
  }),
);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
