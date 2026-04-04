import type { BotActivityType, SentPropertyStatus, AppointmentStatus, BotConfig } from "@/lib/types/bot"

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
  enviada: "Enviada",
  vista: "Vista",
  interesado: "Interesado",
  cita_agendada: "Cita agendada",
  descartada: "Descartada",
}

export const SENT_PROPERTY_STATUS_COLORS: Record<SentPropertyStatus, string> = {
  enviada: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  vista: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  interesado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cita_agendada: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  descartada: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  solicitada: "Solicitada",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  solicitada: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  confirmada: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completada: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, { status: AppointmentStatus; label: string }[]> = {
  solicitada: [
    { status: "confirmada", label: "Confirmar" },
    { status: "cancelada", label: "Cancelar" },
  ],
  confirmada: [
    { status: "completada", label: "Completar" },
    { status: "cancelada", label: "Cancelar" },
  ],
  completada: [],
  cancelada: [],
}

export const DAYS_OF_WEEK = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const

export const DEFAULT_BOT_CONFIG: BotConfig = {
  active: true,
  schedule: {
    lunes: { enabled: true, startTime: "09:00", endTime: "18:00" },
    martes: { enabled: true, startTime: "09:00", endTime: "18:00" },
    miércoles: { enabled: true, startTime: "09:00", endTime: "18:00" },
    jueves: { enabled: true, startTime: "09:00", endTime: "18:00" },
    viernes: { enabled: true, startTime: "09:00", endTime: "18:00" },
    sábado: { enabled: true, startTime: "09:00", endTime: "13:00" },
    domingo: { enabled: false, startTime: "09:00", endTime: "13:00" },
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
