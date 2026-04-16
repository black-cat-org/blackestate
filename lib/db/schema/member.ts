import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { memberRoleEnum } from "./enums";
import { organization } from "./organization";

/**
 * Membership of a user in an organization.
 *
 * `userId` references `auth.users(id)` via cross-schema FK added manually in
 * the migration SQL (Drizzle does not express cross-schema FKs natively).
 * Enforced ON DELETE CASCADE so deleting a user cleans up their memberships.
 *
 * UNIQUE(userId, organizationId): a user can only have one active role per org.
 * Soft delete (`deletedAt`) preserves historical membership for audit.
 */
export const member = pgTable(
  "member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull(),
    title: text("title"),
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
    userOrgUnique: uniqueIndex("member_user_org_unique").on(
      table.userId,
      table.organizationId,
    ),
    userIdx: index("member_user_id_idx").on(table.userId),
    deletedAtIdx: index("member_deleted_at_idx").on(table.deletedAt),
  }),
);

export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
