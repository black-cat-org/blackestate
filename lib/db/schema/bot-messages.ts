import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { botConversations } from "./bot-conversations";
import { messageSenderEnum, messageContentTypeEnum, messageStatusEnum } from "./enums";

export const botMessages = pgTable("bot_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  conversationId: text("conversation_id").notNull().references(() => botConversations.id),

  sender: messageSenderEnum("sender").notNull(),
  contentType: messageContentTypeEnum("content_type").notNull().default("text"),
  text: text("text").notNull(),
  mediaUrl: text("media_url"),
  propertyId: text("property_id"),

  status: messageStatusEnum("status").notNull().default("sent"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("bot_msg_conversation_id_idx").on(t.conversationId),
  index("bot_msg_org_id_idx").on(t.organizationId),
]);
