import { pgTable, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { memberRoleEnum, appPermissionEnum } from "./enums";

/**
 * Maps roles to fine-grained permissions. Seeded in sub-plan 04 with the
 * 57 mappings (23 owner / 22 admin / 12 agent) inherited from Better Auth.
 *
 * Read by the SQL function `public.authorize(permission)` which reads
 * `auth.jwt() ->> 'org_role'` to determine if the current user has the
 * requested permission. Used in RLS policies for fine-grained checks.
 *
 * No FK to organization — permissions are global per role, not per-tenant.
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: memberRoleEnum("role").notNull(),
    permission: appPermissionEnum("permission").notNull(),
  },
  (table) => ({
    rolePermUnique: uniqueIndex("role_permissions_role_perm_unique").on(
      table.role,
      table.permission,
    ),
  }),
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
