import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

// `property.assign` supports bulk property transfer between agents (impl-plan item 2.1.15.11).
// Added here so it stays in sync with `appPermissionEnum` in lib/db/schema/enums.ts — the
// seed of public.role_permissions in sub-plan 04 derives from this file as source of truth.
const statement = {
  ...defaultStatements,
  property: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  lead: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  analytics: ["read_own", "read_all"],
  bot: ["read", "configure"],
  settings: ["read", "manage"],
  billing: ["manage"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  ...ownerAc.statements,
  property: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  lead: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  analytics: ["read_own", "read_all"],
  bot: ["read", "configure"],
  settings: ["read", "manage"],
  billing: ["manage"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  property: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  lead: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  analytics: ["read_own", "read_all"],
  bot: ["read", "configure"],
  settings: ["read", "manage"],
});

export const agent = ac.newRole({
  ...memberAc.statements,
  property: ["create", "read_own", "read_all", "edit_own", "delete_own"],
  lead: ["create", "read_own", "read_all", "edit_own"],
  analytics: ["read_own"],
  bot: ["read"],
  settings: ["read"],
});
