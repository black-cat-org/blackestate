import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleAppointmentRepository } from "@/features/appointments/infrastructure/drizzle-appointment.repository"

export async function deleteAppointmentUseCase(
  ctx: SessionContext,
  id: string,
): Promise<void> {
  const repo = new DrizzleAppointmentRepository()
  return repo.softDelete(ctx, id)
}
