import type { leads } from "@/lib/db/schema"
import type { leadPropertyQueue } from "@/lib/db/schema"

export type LeadRow = typeof leads.$inferSelect
export type LeadInsert = typeof leads.$inferInsert
export type QueueItemRow = typeof leadPropertyQueue.$inferSelect
export type QueueItemInsert = typeof leadPropertyQueue.$inferInsert
