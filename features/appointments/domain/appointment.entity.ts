export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled"

export interface Appointment {
  id: string
  leadId: string
  leadName: string
  leadPhone?: string
  propertyId: string
  propertyTitle: string
  date: string
  time: string
  endTime: string
  status: AppointmentStatus
  notes?: string
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  cancelledAt?: string
}

export interface CreateAppointmentDTO {
  leadId: string
  leadName: string
  leadPhone?: string
  propertyId: string
  propertyTitle: string
  date: string
  time: string
  endTime: string
  notes?: string
}
