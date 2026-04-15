"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getAppointmentsUseCase } from "@/features/appointments/application/get-appointments.use-case"
import { getAppointmentsByLeadUseCase } from "@/features/appointments/application/get-appointments-by-lead.use-case"
import { getAppointmentsByDateUseCase } from "@/features/appointments/application/get-appointments-by-date.use-case"
import { createAppointmentUseCase } from "@/features/appointments/application/create-appointment.use-case"
import { updateAppointmentStatusUseCase } from "@/features/appointments/application/update-appointment-status.use-case"
import { deleteAppointmentUseCase } from "@/features/appointments/application/delete-appointment.use-case"
import type { Appointment, AppointmentStatus, CreateAppointmentDTO } from "@/features/appointments/domain/appointment.entity"

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

export async function deleteAppointmentAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deleteAppointmentUseCase(ctx, id)
}
