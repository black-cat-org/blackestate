import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { contact } from "./contact";
import { conversationStatusEnum } from "./enums";

export const botConversations = pgTable("bot_conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: uuid("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contact.id, { onDelete: "cascade" }),

  status: conversationStatusEnum("status").notNull().default("active"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: uuid("deleted_by_user_id"),
  deletedByUserName: text("deleted_by_user_name"),
  deletedByUserEmail: text("deleted_by_user_email"),
}, (t) => [
  index("bot_conv_org_id_idx").on(t.organizationId),
  index("bot_conv_contact_id_idx").on(t.contactId),
]);
