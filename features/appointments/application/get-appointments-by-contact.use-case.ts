import type { Appointment } from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleAppointmentRepository } from "@/features/appointments/infrastructure/drizzle-appointment.repository"

export async function getAppointmentsByContactUseCase(
  ctx: SessionContext,
  contactId: string,
): Promise<Appointment[]> {
  const repo = new DrizzleAppointmentRepository()
  return repo.findByContact(ctx, contactId)
}
