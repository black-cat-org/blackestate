import type { appointments } from "@/lib/db/schema"

export type AppointmentRow = typeof appointments.$inferSelect
export type AppointmentInsert = typeof appointments.$inferInsert
