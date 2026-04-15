import type { Appointment, CreateAppointmentDTO } from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { AppointmentRow, AppointmentInsert } from "./appointment.model"

// ---------------------------------------------------------------------------
// Model (DB row) -> Entity (domain)
// ---------------------------------------------------------------------------

export function mapRowToEntity(
  row: AppointmentRow,
  leadName: string,
  leadPhone: string | undefined,
  propertyTitle: string,
): Appointment {
  return {
    id: row.id,
    leadId: row.leadId,
    leadName,
    leadPhone,
    propertyId: row.propertyId,
    propertyTitle,
    date: row.startsAt.toISOString().split("T")[0],
    time: row.startsAt.toISOString().slice(11, 16),
    endTime: row.endsAt.toISOString().slice(11, 16),
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? undefined,
    completedAt: row.completedAt?.toISOString() ?? undefined,
    cancelledAt: row.cancelledAt?.toISOString() ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// CreateDTO -> Insert model
// ---------------------------------------------------------------------------

export function mapCreateDTOToInsert(
  data: CreateAppointmentDTO,
  ctx: SessionContext,
): AppointmentInsert {
  return {
    organizationId: ctx.orgId,
    createdByUserId: ctx.userId,
    leadId: data.leadId,
    propertyId: data.propertyId,
    startsAt: new Date(`${data.date}T${data.time}:00Z`),
    endsAt: new Date(`${data.date}T${data.endTime}:00Z`),
    notes: data.notes ?? null,
  }
}
