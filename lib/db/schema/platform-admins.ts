import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";

/**
 * Cross-tenant super admin allowlist. Read by `custom_access_token_hook`
 * (sub-plan 03) to inject `is_super_admin: true` into the JWT.
 *
 * `userId` FK to `auth.users(id)` ON DELETE CASCADE — declared via SQL patch
 * in the migration since Drizzle does not express cross-schema FKs natively.
 *
 * Migrated text → uuid in the auth-migration (sub-plan 01) to align with
 * Supabase Auth's native UUID identifier convention.
 */
export const platformAdmins = pgTable("platform_admins", {
  userId: uuid("user_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;
