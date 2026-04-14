export type MessageSender = "bot" | "client" | "agent"
export type MessageContentType = "text" | "image" | "pdf" | "property_card"
export type MessageStatus = "sent" | "delivered" | "read"

export interface BotMessage {
  id: string
  leadId: string
  sender: MessageSender
  contentType: MessageContentType
  text: string
  mediaUrl?: string
  propertyId?: string
  status: MessageStatus
  timestamp: string
}

export type SentPropertyStatus = "sent" | "viewed" | "interested" | "appointment_scheduled" | "discarded"

export interface SentProperty {
  id: string
  leadId: string
  propertyId: string
  propertyTitle: string
  status: SentPropertyStatus
  sentAt: string
  viewedAt?: string
  respondedAt?: string
}

export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled"

export interface Appointment {
  id: string
  leadId: string
  leadName: string
  leadPhone: string
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

export type BotActivityType =
  | "property_sent"
  | "message_received"
  | "message_sent"
  | "appointment_requested"
  | "appointment_confirmed"
  | "appointment_completed"
  | "appointment_cancelled"
  | "reminder_sent"
  | "property_viewed"
  | "lead_created"

export interface BotActivity {
  id: string
  leadId: string
  leadName: string
  type: BotActivityType
  description: string
  propertyId?: string
  appointmentId?: string
  messageId?: string
  timestamp: string
}

export interface AgentNotification {
  id: string
  type: BotActivityType
  title: string
  description: string
  leadId?: string
  appointmentId?: string
  read: boolean
  createdAt: string
}

export interface BotScheduleDay {
  enabled: boolean
  startTime: string
  endTime: string
}

export interface BotConfig {
  active: boolean
  schedule: Record<string, BotScheduleDay>
  welcomeMessage: string
  appointmentDuration: number
  reminderHoursBefore: number
  notifications: {
    newAppointmentRequest: boolean
    appointmentConfirmed: boolean
    reminderBeforeAppointment: boolean
    everyClientMessage: boolean
  }
}
