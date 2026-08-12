import type {
  Appointment,
  AppointmentOrigin,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { AppointmentRow, AppointmentInsert } from "./appointment.model"

// ---------------------------------------------------------------------------
// Model (DB row) -> Entity (domain)
// ---------------------------------------------------------------------------

export function mapRowToEntity(
  row: AppointmentRow,
  contactId: string,
  contactName: string,
  contactPhone: string | undefined,
  propertyTitle: string,
): Appointment {
  // Derive `completed` at read time: any `confirmed` row whose `ends_at`
  // has passed counts as completed for the UI. The DB does NOT store this
  // transition — `completed` is not a state the user sets, it's a fact
  // about the clock. See docs/plans/analytics-appointments.md for the
  // model rationale and the future SQL view alternative if metrics ever
  // need to filter on `completed` at the SQL level.
  const now = new Date()
  const isPastConfirmed = row.status === "confirmed" && row.endsAt < now
  const effectiveStatus = isPastConfirmed ? "completed" : row.status
  const effectiveCompletedAt =
    isPastConfirmed && !row.completedAt
      ? row.endsAt.toISOString()
      : row.completedAt?.toISOString() ?? undefined
  return {
    id: row.id,
    dealId: row.dealId,
    contactId,
    contactName,
    contactPhone,
    propertyId: row.propertyId,
    propertyTitle,
    date: row.startsAt.toISOString().split("T")[0],
    time: row.startsAt.toISOString().slice(11, 16),
    endTime: row.endsAt.toISOString().slice(11, 16),
    status: effectiveStatus,
    origin: row.origin as AppointmentOrigin,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? undefined,
    completedAt: effectiveCompletedAt,
    cancelledAt: row.cancelledAt?.toISOString() ?? undefined,
    deletedAt: row.deletedAt?.toISOString() ?? undefined,
    deletedBy:
      row.deletedByUserId || row.deletedByUserName || row.deletedByUserEmail
        ? {
            userId: row.deletedByUserId ?? undefined,
            userName: row.deletedByUserName ?? undefined,
            userEmail: row.deletedByUserEmail ?? undefined,
          }
        : undefined,
  }
}

// ---------------------------------------------------------------------------
// CreateDTO -> Insert model
// ---------------------------------------------------------------------------

export function mapCreateDTOToInsert(
  data: CreateAppointmentDTO,
  ctx: SessionContext,
): AppointmentInsert {
  // Status at creation is purely a function of origin:
  //   - agent → 'confirmed' (the agent IS confirming by creating)
  //   - bot   → 'requested' (the bot books, agent must confirm later)
  // Past dates are allowed and stay as 'confirmed' — `completed` is NOT
  // a state that gets stored on create. It is derived at read time by
  // `mapRowToEntity` when `confirmed AND ends_at < now()`. See
  // docs/plans/analytics-appointments.md for the model rationale.
  const now = new Date()
  return {
    organizationId: ctx.orgId,
    createdByUserId: ctx.userId,
    dealId: data.dealId,
    propertyId: data.propertyId,
    startsAt: new Date(`${data.date}T${data.time}:00Z`),
    endsAt: new Date(`${data.date}T${data.endTime}:00Z`),
    origin: data.origin,
    status: data.origin === "agent" ? "confirmed" : "requested",
    confirmedAt: data.origin === "agent" ? now : null,
    notes: data.notes ?? null,
  }
}

// ---------------------------------------------------------------------------
// UpdateDTO -> partial Update model
// ---------------------------------------------------------------------------

export function mapUpdateDTOToUpdate(
  data: UpdateAppointmentDTO,
  current: { date: string; time: string; endTime: string },
): Partial<AppointmentInsert> {
  const update: Partial<AppointmentInsert> = {}
  const date = data.date ?? current.date
  const time = data.time ?? current.time
  const endTime = data.endTime ?? current.endTime
  if (data.date !== undefined || data.time !== undefined) {
    update.startsAt = new Date(`${date}T${time}:00Z`)
  }
  if (data.date !== undefined || data.time !== undefined || data.endTime !== undefined) {
    update.endsAt = new Date(`${date}T${endTime}:00Z`)
  }
  if (data.notes !== undefined) {
    update.notes = data.notes || null
  }
  return update
}
