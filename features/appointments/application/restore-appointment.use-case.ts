import type { Appointment } from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleAppointmentRepository } from "@/features/appointments/infrastructure/drizzle-appointment.repository"

export async function restoreAppointmentUseCase(
  ctx: SessionContext,
  id: string,
): Promise<Appointment> {
  const repo = new DrizzleAppointmentRepository()
  return repo.restore(ctx, id)
}
