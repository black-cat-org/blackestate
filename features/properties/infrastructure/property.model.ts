import type { properties } from "@/lib/db/schema"

export type PropertyRow = typeof properties.$inferSelect
export type PropertyInsert = typeof properties.$inferInsert
