import type {
  Appointment,
  UpdateAppointmentDTO,
} from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleAppointmentRepository } from "@/features/appointments/infrastructure/drizzle-appointment.repository"

export async function updateAppointmentUseCase(
  ctx: SessionContext,
  id: string,
  data: UpdateAppointmentDTO,
): Promise<Appointment> {
  const repo = new DrizzleAppointmentRepository()
  return repo.update(ctx, id, data)
}
