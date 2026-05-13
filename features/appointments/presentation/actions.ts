"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getAppointmentsUseCase } from "@/features/appointments/application/get-appointments.use-case"
import { getAppointmentsByLeadUseCase } from "@/features/appointments/application/get-appointments-by-lead.use-case"
import { getAppointmentsByDateUseCase } from "@/features/appointments/application/get-appointments-by-date.use-case"
import { getDeletedAppointmentsUseCase } from "@/features/appointments/application/get-deleted-appointments.use-case"
import { createAppointmentUseCase } from "@/features/appointments/application/create-appointment.use-case"
import { updateAppointmentUseCase } from "@/features/appointments/application/update-appointment.use-case"
import { updateAppointmentStatusUseCase } from "@/features/appointments/application/update-appointment-status.use-case"
import { deleteAppointmentUseCase } from "@/features/appointments/application/delete-appointment.use-case"
import { restoreAppointmentUseCase } from "@/features/appointments/application/restore-appointment.use-case"
import { appointmentUpdateSchema } from "@/lib/validations/appointment"
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "@/features/appointments/domain/appointment.entity"

// ---------------------------------------------------------------------------
// Authenticated actions (require session context)
// ---------------------------------------------------------------------------

export async function getAppointmentsAction(): Promise<Appointment[]> {
  const ctx = await getSessionContext()
  return getAppointmentsUseCase(ctx)
}

export async function getAppointmentsByLeadAction(
  leadId: string,
): Promise<Appointment[]> {
  const ctx = await getSessionContext()
  return getAppointmentsByLeadUseCase(ctx, leadId)
}

export async function getAppointmentsByDateAction(
  date: string,
): Promise<Appointment[]> {
  const ctx = await getSessionContext()
  return getAppointmentsByDateUseCase(ctx, date)
}

export async function createAppointmentAction(
  data: CreateAppointmentDTO,
): Promise<Appointment> {
  const ctx = await getSessionContext()
  return createAppointmentUseCase(ctx, data)
}

export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  const ctx = await getSessionContext()
  return updateAppointmentStatusUseCase(ctx, id, status)
}

export async function updateAppointmentAction(
  id: string,
  data: UpdateAppointmentDTO,
): Promise<Appointment> {
  const parsed = appointmentUpdateSchema.parse(data)
  const ctx = await getSessionContext()
  return updateAppointmentUseCase(ctx, id, parsed)
}

export async function deleteAppointmentAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deleteAppointmentUseCase(ctx, id)
}

export async function getDeletedAppointmentsAction(): Promise<Appointment[]> {
  const ctx = await getSessionContext()
  return getDeletedAppointmentsUseCase(ctx)
}

export async function restoreAppointmentAction(
  id: string,
): Promise<Appointment> {
  const ctx = await getSessionContext()
  return restoreAppointmentUseCase(ctx, id)
}
