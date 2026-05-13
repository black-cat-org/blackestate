import { pgTable, text, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const agentProfiles = pgTable("agent_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull(),
  organizationId: uuid("organization_id").notNull(),

  bio: text("bio"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  website: text("website"),
  avatarUrl: text("avatar_url"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: uuid("deleted_by_user_id"),
  deletedByUserName: text("deleted_by_user_name"),
  deletedByUserEmail: text("deleted_by_user_email"),
}, (t) => [
  uniqueIndex("agent_profiles_user_org_idx").on(t.userId, t.organizationId),
]);
