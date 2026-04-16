import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./organization";

/**
 * Persists the active organization choice for each user across sessions.
 *
 * Read by `custom_access_token_hook` (sub-plan 03) to inject `active_org_id`
 * into the JWT on every refresh. Updated via `switchActiveOrgAction`
 * (sub-plan 05) followed by `supabase.auth.refreshSession()` so the JWT
 * picks up the new value immediately.
 *
 * `userId` FK to `auth.users(id)` ON DELETE CASCADE.
 * One row per user (PK on userId).
 */
export const userActiveOrg = pgTable("user_active_org", {
  userId: uuid("user_id").primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserActiveOrg = typeof userActiveOrg.$inferSelect;
export type NewUserActiveOrg = typeof userActiveOrg.$inferInsert;

