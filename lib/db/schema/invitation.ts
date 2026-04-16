import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { invitationStatusEnum, memberRoleEnum } from "./enums";
import { organization } from "./organization";

/**
 * Pending or historical invitation to join an organization.
 *
 * `invitedByUserId` FK to `auth.users(id)` with ON DELETE SET NULL — losing
 * the inviter does not invalidate pending invitations. Nullable at the column
 * level because SET NULL requires it, but enforced NOT NULL for pending rows
 * via a CHECK constraint added in migration SQL (Drizzle does not express
 * CHECK natively):
 *
 *   CHECK (status != 'pending' OR invited_by_user_id IS NOT NULL)
 *
 * `token` is the opaque value embedded in the invitation email link
 * (`/accept-invite?inv=<token>`). Generated server-side via crypto.randomUUID().
 */
export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    token: text("token").notNull().unique(),
    invitedByUserId: uuid("invited_by_user_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    orgIdx: index("invitation_organization_id_idx").on(table.organizationId),
    emailIdx: index("invitation_email_idx").on(table.email),
    statusIdx: index("invitation_status_idx").on(table.status),
  }),
);

export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;
