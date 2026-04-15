import type { Appointment, CreateAppointmentDTO } from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleAppointmentRepository } from "@/features/appointments/infrastructure/drizzle-appointment.repository"

export async function createAppointmentUseCase(
  ctx: SessionContext,
  data: CreateAppointmentDTO,
): Promise<Appointment> {
  const repo = new DrizzleAppointmentRepository()
  return repo.create(ctx, data)
}
