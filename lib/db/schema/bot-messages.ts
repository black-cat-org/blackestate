import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const botMessages = pgTable("bot_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull(),

  sender: text("sender").notNull(), // bot, client, agent
  contentType: text("content_type").notNull().default("text"), // text, image, pdf, property_card
  text: text("text").notNull(),
  mediaUrl: text("media_url"),
  propertyId: text("property_id"),

  status: text("status").notNull().default("sent"), // sent, delivered, read

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("bot_msg_conversation_id_idx").on(t.conversationId),
]);
