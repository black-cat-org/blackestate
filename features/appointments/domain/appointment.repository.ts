import type { SessionContext } from "@/features/shared/domain/session-context"
import type { Appointment, AppointmentStatus, CreateAppointmentDTO } from "./appointment.entity"

export interface IAppointmentRepository {
  findAll(ctx: SessionContext): Promise<Appointment[]>
  findByLead(ctx: SessionContext, leadId: string): Promise<Appointment[]>
  findByDate(ctx: SessionContext, date: string): Promise<Appointment[]>
  create(ctx: SessionContext, data: CreateAppointmentDTO): Promise<Appointment>
  updateStatus(ctx: SessionContext, id: string, status: AppointmentStatus): Promise<Appointment>
  softDelete(ctx: SessionContext, id: string): Promise<void>
}
