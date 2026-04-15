import type { botConversations, botMessages, botConfig } from "@/lib/db/schema"

export type ConversationRow = typeof botConversations.$inferSelect
export type MessageRow = typeof botMessages.$inferSelect
export type MessageInsert = typeof botMessages.$inferInsert
export type ConfigRow = typeof botConfig.$inferSelect
