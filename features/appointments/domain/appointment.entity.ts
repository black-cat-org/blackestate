export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled"

export type AppointmentOrigin = "agent" | "bot"

export interface AppointmentDeletedBy {
  userId?: string
  userName?: string
  userEmail?: string
}

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
  origin: AppointmentOrigin
  notes?: string
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  cancelledAt?: string
  deletedAt?: string
  deletedBy?: AppointmentDeletedBy
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
  origin: AppointmentOrigin
  notes?: string
}

export interface UpdateAppointmentDTO {
  date?: string
  time?: string
  endTime?: string
  notes?: string
}
