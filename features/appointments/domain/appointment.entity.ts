export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled"

export type AppointmentOrigin = "agent" | "bot"

export interface AppointmentDeletedBy {
  userId?: string
  userName?: string
  userEmail?: string
}

/**
 * An Appointment is a scheduled visit on a Deal. It belongs to exactly one
 * Deal (which itself belongs to a Contact + Property), so the `dealId` is
 * the primary foreign key. The contact details (`contactId`, `contactName`,
 * `contactPhone`) are denormalised from the Deal → Contact join so list
 * views don't need to re-join repeatedly. The mapper is the single point
 * of denormalisation — the FK column on the DB is only `deal_id`.
 *
 * R34 (2026-05-15) switched this entity from the legacy `leadId` /
 * `leadName` / `leadPhone` shape to the Deal-centric model. The DB
 * migration (`drizzle/sql/027`) renamed `appointments.lead_id` →
 * `deal_id`, dropped the legacy FK, and auto-created deals for orphan
 * (contact, property) pairs whose original Lead never produced a deal in
 * the R12 collapse.
 */
export interface Appointment {
  id: string
  dealId: string
  contactId: string
  contactName: string
  contactPhone?: string
  propertyId: string
  propertyTitle: string
  date: string
  time: string
  endTime: string
  status: AppointmentStatus
  origin: AppointmentOrigin
  notes?: string
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  cancelledAt?: string
  deletedAt?: string
  deletedBy?: AppointmentDeletedBy
}

export interface CreateAppointmentDTO {
  dealId: string
  contactId: string
  contactName: string
  contactPhone?: string
  propertyId: string
  propertyTitle: string
  date: string
  time: string
  endTime: string
  origin: AppointmentOrigin
  notes?: string
}

export interface UpdateAppointmentDTO {
  date?: string
  time?: string
  endTime?: string
  notes?: string
}
