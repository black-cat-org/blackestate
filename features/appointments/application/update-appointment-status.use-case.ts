import type { Appointment, AppointmentStatus } from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleAppointmentRepository } from "@/features/appointments/infrastructure/drizzle-appointment.repository"

export async function updateAppointmentStatusUseCase(
  ctx: SessionContext,
  id: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  // `completed` is a derived state, never a target the caller can set
  // directly. The mapper computes it on read from
  // `confirmed AND ends_at < now()`. Persisting `completed` would
  // break that contract: a future-dated appointment with `status=completed`
  // in DB would display as completed before its end time. Defense in
  // depth — the UI's `APPOINTMENT_STATUS_TRANSITIONS.completed = []`
  // already blocks the UI path, but the action could be reached
  // programmatically (future bot/Inngest flows). Throw at the
  // application boundary instead of trusting downstream callers.
  if (status === "completed") {
    throw new Error("APPOINTMENT_STATUS_COMPLETED_IS_DERIVED")
  }
  const repo = new DrizzleAppointmentRepository()
  return repo.updateStatus(ctx, id, status)
}
