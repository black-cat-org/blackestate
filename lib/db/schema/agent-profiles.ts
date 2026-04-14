import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const agentProfiles = pgTable("agent_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  organizationId: text("organization_id").notNull(),

  bio: text("bio"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  website: text("website"),
  avatarUrl: text("avatar_url"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("agent_profiles_user_org_idx").on(t.userId, t.organizationId),
]);
