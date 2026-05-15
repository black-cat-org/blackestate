import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "./appointment.entity"

export interface IAppointmentRepository {
  findAll(ctx: SessionContext): Promise<Appointment[]>
  findAllDeleted(ctx: SessionContext): Promise<Appointment[]>
  findByDeal(ctx: SessionContext, dealId: string): Promise<Appointment[]>
  /**
   * All non-deleted appointments whose Deal belongs to the given
   * Contact. Powers the "Citas" sub-section of the contact detail
   * page. Mirrors `findByDeal` but joins through `deal.contact_id`
   * instead of filtering on `appointments.deal_id` directly — the
   * appointment table only knows its deal, the contact link is one
   * hop further through the deal row.
   */
  findByContact(ctx: SessionContext, contactId: string): Promise<Appointment[]>
  findByDate(ctx: SessionContext, date: string): Promise<Appointment[]>
  create(ctx: SessionContext, data: CreateAppointmentDTO): Promise<Appointment>
  update(ctx: SessionContext, id: string, data: UpdateAppointmentDTO): Promise<Appointment>
  updateStatus(ctx: SessionContext, id: string, status: AppointmentStatus): Promise<Appointment>
  softDelete(ctx: SessionContext, id: string): Promise<void>
  restore(ctx: SessionContext, id: string): Promise<Appointment>
}
