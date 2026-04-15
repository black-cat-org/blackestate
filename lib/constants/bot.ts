import type { BotActivityType, SentPropertyStatus, BotConfig } from "@/features/bot/domain/bot.entity"
import type { AppointmentStatus } from "@/features/appointments/domain/appointment.entity"

export const BOT_ACTIVITY_LABELS: Record<BotActivityType, string> = {
  property_sent: "Propiedad enviada",
  message_received: "Mensaje recibido",
  message_sent: "Mensaje enviado",
  appointment_requested: "Cita solicitada",
  appointment_confirmed: "Cita confirmada",
  appointment_completed: "Cita completada",
  appointment_cancelled: "Cita cancelada",
  reminder_sent: "Recordatorio enviado",
  property_viewed: "Propiedad vista",
  lead_created: "Lead registrado",
}

export const BOT_ACTIVITY_COLORS: Record<BotActivityType, string> = {
  property_sent: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  message_received: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  message_sent: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  appointment_requested: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  appointment_confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  appointment_completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  appointment_cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  reminder_sent: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  property_viewed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  lead_created: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
}

export const BOT_ACTIVITY_ICONS: Record<BotActivityType, string> = {
  property_sent: "Send",
  message_received: "MessageSquare",
  message_sent: "Bot",
  appointment_requested: "CalendarPlus",
  appointment_confirmed: "CalendarCheck",
  appointment_completed: "CheckCircle",
  appointment_cancelled: "CalendarX",
  reminder_sent: "Bell",
  property_viewed: "Eye",
  lead_created: "UserPlus",
}

export const SENT_PROPERTY_STATUS_LABELS: Record<SentPropertyStatus, string> = {
  sent: "Enviada",
  viewed: "Vista",
  interested: "Interesado",
  appointment_scheduled: "Cita agendada",
  discarded: "Descartada",
}

export const SENT_PROPERTY_STATUS_COLORS: Record<SentPropertyStatus, string> = {
  sent: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  viewed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  interested: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  appointment_scheduled: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  discarded: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  requested: "Solicitada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  requested: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, { status: AppointmentStatus; label: string }[]> = {
  requested: [
    { status: "confirmed", label: "Confirmar" },
    { status: "cancelled", label: "Cancelar" },
  ],
  confirmed: [
    { status: "cancelled", label: "Cancelar" },
  ],
  completed: [],
  cancelled: [],
}

export const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const

export const DEFAULT_BOT_CONFIG: BotConfig = {
  active: true,
  schedule: {
    monday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    saturday: { enabled: true, startTime: "09:00", endTime: "13:00" },
    sunday: { enabled: false, startTime: "09:00", endTime: "13:00" },
  },
  welcomeMessage: "¡Hola {nombre}! 👋 Soy el asistente virtual de {agente}. Vi que te interesa la propiedad \"{propiedad}\". Te envío toda la información disponible. ¿Tenés alguna consulta?",
  appointmentDuration: 60,
  reminderHoursBefore: 2,
  notifications: {
    newAppointmentRequest: true,
    appointmentConfirmed: true,
    reminderBeforeAppointment: true,
    everyClientMessage: false,
  },
}
