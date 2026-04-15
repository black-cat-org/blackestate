import type { Appointment, AppointmentStatus } from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleAppointmentRepository } from "@/features/appointments/infrastructure/drizzle-appointment.repository"

export async function updateAppointmentStatusUseCase(
  ctx: SessionContext,
  id: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  const repo = new DrizzleAppointmentRepository()
  return repo.updateStatus(ctx, id, status)
}
