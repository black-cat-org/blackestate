import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  property: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all"],
  lead: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  analytics: ["read_own", "read_all"],
  bot: ["read", "configure"],
  settings: ["read", "manage"],
  billing: ["manage"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  ...ownerAc.statements,
  property: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all"],
  lead: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all", "assign"],
  analytics: ["read_own", "read_all"],
  bot: ["read", "configure"],
  settings: ["read", "manage"],
  billing: ["manage"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  property: ["create", "read_own", "read_all", "edit_own", "edit_all", "delete_own", "delete_all"],
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
