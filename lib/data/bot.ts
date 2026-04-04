import type {
  BotMessage,
  SentProperty,
  Appointment,
  AppointmentStatus,
  BotActivity,
  AgentNotification,
  BotConfig,
} from "@/lib/types/bot"
import { DEFAULT_BOT_CONFIG } from "@/lib/constants/bot"

// ============================================================
// Mock Messages
// ============================================================

const mockMessages: BotMessage[] = [
  // Lead 1 - Carla Mendoza: bot envía info → pregunta → responde → pide cita → confirma
  {
    id: "m1",
    leadId: "1",
    sender: "bot",
    contentType: "text",
    text: "¡Hola Carla! 👋 Soy el asistente virtual de Black Estate. Vi que te interesa la propiedad \"Casa moderna en Equipetrol\". Te envío toda la información disponible. ¿Tienes alguna consulta?",
    status: "read",
    timestamp: "2026-02-20T14:31:00Z",
  },
  {
    id: "m2",
    leadId: "1",
    sender: "bot",
    contentType: "property_card",
    text: "Casa moderna en Equipetrol — US$ 450.000",
    propertyId: "1",
    status: "read",
    timestamp: "2026-02-20T14:31:05Z",
  },
  {
    id: "m3",
    leadId: "1",
    sender: "client",
    contentType: "text",
    text: "Hola! Sí, me encanta esa casa. ¿Cuántos metros cubiertos tiene? ¿Y la zona es tranquila?",
    status: "read",
    timestamp: "2026-02-20T15:10:00Z",
  },
  {
    id: "m4",
    leadId: "1",
    sender: "bot",
    contentType: "text",
    text: "La casa tiene 320 m² totales y 280 m² cubiertos. Equipetrol es una zona muy tranquila, residencial, con excelente acceso a comercios y restaurantes. ¿Te gustaría coordinar una visita?",
    status: "read",
    timestamp: "2026-02-20T15:10:30Z",
  },
  {
    id: "m5",
    leadId: "1",
    sender: "client",
    contentType: "text",
    text: "Sí, me encantaría visitarla. ¿Tienen disponibilidad este fin de semana?",
    status: "read",
    timestamp: "2026-02-20T16:00:00Z",
  },
  {
    id: "m6",
    leadId: "1",
    sender: "bot",
    contentType: "text",
    text: "¡Perfecto! Tenemos estos horarios disponibles:\n- Sábado 22/02 a las 10:00\n- Sábado 22/02 a las 15:00\n- Domingo 23/02 a las 11:00\n¿Cuál te queda mejor?",
    status: "read",
    timestamp: "2026-02-20T16:00:30Z",
  },
  {
    id: "m7",
    leadId: "1",
    sender: "client",
    contentType: "text",
    text: "El sábado a las 10 me viene perfecto!",
    status: "read",
    timestamp: "2026-02-20T16:15:00Z",
  },
  {
    id: "m8",
    leadId: "1",
    sender: "bot",
    contentType: "text",
    text: "¡Listo! Tu visita quedó agendada para el sábado 22/02 a las 10:00 hs. Te enviaré un recordatorio el viernes. ¡Nos vemos! 🏠",
    status: "read",
    timestamp: "2026-02-20T16:15:30Z",
  },

  // Lead 2 - Fernando Rojas: bot envía info → conversa sobre zona → sugerencias
  {
    id: "m9",
    leadId: "2",
    sender: "bot",
    contentType: "text",
    text: "¡Hola Fernando! Soy el asistente de Black Estate. Veo que estás interesado en la \"Casa moderna en Equipetrol\". Te paso los detalles.",
    status: "read",
    timestamp: "2026-02-18T09:16:00Z",
  },
  {
    id: "m10",
    leadId: "2",
    sender: "bot",
    contentType: "property_card",
    text: "Casa moderna en Equipetrol — US$ 450.000",
    propertyId: "1",
    status: "read",
    timestamp: "2026-02-18T09:16:05Z",
  },
  {
    id: "m11",
    leadId: "2",
    sender: "client",
    contentType: "text",
    text: "Gracias! Busco algo similar pero en Urubó también. ¿Tienen opciones por esa zona?",
    status: "read",
    timestamp: "2026-02-18T10:30:00Z",
  },
  {
    id: "m12",
    leadId: "2",
    sender: "bot",
    contentType: "text",
    text: "¡Claro! Tenemos estas propiedades que podrían interesarte en Urubó y alrededores:",
    status: "read",
    timestamp: "2026-02-18T10:30:30Z",
  },
  {
    id: "m13",
    leadId: "2",
    sender: "bot",
    contentType: "property_card",
    text: "Departamento 2 amb en Norte — Bs. 650.000",
    propertyId: "2",
    status: "read",
    timestamp: "2026-02-18T10:30:35Z",
  },
  {
    id: "m14",
    leadId: "2",
    sender: "bot",
    contentType: "property_card",
    text: "PH reciclado en Las Palmas — US$ 185.000",
    propertyId: "6",
    status: "read",
    timestamp: "2026-02-18T10:30:40Z",
  },
  {
    id: "m15",
    leadId: "2",
    sender: "client",
    contentType: "text",
    text: "El departamento en Norte me interesa, voy a verlo con más detalle. Gracias!",
    status: "read",
    timestamp: "2026-02-18T11:00:00Z",
  },

  // Lead 7 - Valentina Ruiz: bot envía info → pide cita → pendiente
  {
    id: "m16",
    leadId: "7",
    sender: "bot",
    contentType: "text",
    text: "¡Hola Valentina! Soy el asistente de Black Estate. Te interesa el \"Departamento 2 amb en Norte\", ¿no? Acá te paso la info.",
    status: "read",
    timestamp: "2026-02-22T07:46:00Z",
  },
  {
    id: "m17",
    leadId: "7",
    sender: "bot",
    contentType: "property_card",
    text: "Departamento 2 amb en Norte — Bs. 650.000",
    propertyId: "2",
    status: "read",
    timestamp: "2026-02-22T07:46:05Z",
  },
  {
    id: "m18",
    leadId: "7",
    sender: "client",
    contentType: "text",
    text: "Hola! Sí, quiero agendar una visita lo antes posible. ¿Cuándo se puede?",
    status: "read",
    timestamp: "2026-02-22T08:30:00Z",
  },
  {
    id: "m19",
    leadId: "7",
    sender: "bot",
    contentType: "text",
    text: "¡Genial! Estamos verificando la disponibilidad del agente. Te confirmo a la brevedad con los horarios posibles. 📅",
    status: "delivered",
    timestamp: "2026-02-22T08:30:30Z",
  },
]

let messages: BotMessage[] = [...mockMessages]

// ============================================================
// Mock Sent Properties
// ============================================================

const mockSentProperties: SentProperty[] = [
  // Lead 1 — Carla Mendoza
  { id: "sp1", leadId: "1", propertyId: "1", propertyTitle: "Casa moderna en Equipetrol", status: "cita_agendada", sentAt: "2026-02-20T14:31:05Z", viewedAt: "2026-02-20T14:35:00Z", respondedAt: "2026-02-20T15:10:00Z" },
  // Lead 2 — Fernando Rojas
  { id: "sp2", leadId: "2", propertyId: "1", propertyTitle: "Casa moderna en Equipetrol", status: "vista", sentAt: "2026-02-18T09:16:05Z", viewedAt: "2026-02-18T09:20:00Z" },
  { id: "sp3", leadId: "2", propertyId: "2", propertyTitle: "Departamento 2 amb en Norte", status: "interesado", sentAt: "2026-02-18T10:30:35Z", viewedAt: "2026-02-18T10:45:00Z", respondedAt: "2026-02-18T11:00:00Z" },
  { id: "sp4", leadId: "2", propertyId: "6", propertyTitle: "PH reciclado en Las Palmas", status: "enviada", sentAt: "2026-02-18T10:30:40Z" },
  // Lead 7 — Valentina Ruiz
  { id: "sp5", leadId: "7", propertyId: "2", propertyTitle: "Departamento 2 amb en Norte", status: "interesado", sentAt: "2026-02-22T07:46:05Z", viewedAt: "2026-02-22T07:50:00Z", respondedAt: "2026-02-22T08:30:00Z" },
  { id: "sp6", leadId: "7", propertyId: "8", propertyTitle: "Cabaña en Samaipata", status: "enviada", sentAt: "2026-02-22T09:00:00Z" },
  // Lead 4 — Hugo Chávez Peña
  { id: "sp7", leadId: "4", propertyId: "3", propertyTitle: "Terreno en Urubó", status: "vista", sentAt: "2026-02-21T16:21:00Z", viewedAt: "2026-02-21T17:00:00Z" },
  // Lead 5 — Lucía Justiniano (ganado)
  { id: "sp8", leadId: "5", propertyId: "5", propertyTitle: "Oficina premium en Equipetrol Norte", status: "cita_agendada", sentAt: "2026-01-28T10:01:00Z", viewedAt: "2026-01-28T10:05:00Z", respondedAt: "2026-01-28T10:30:00Z" },
]

let sentProperties: SentProperty[] = [...mockSentProperties]

// ============================================================
// Mock Appointments
// ============================================================

const mockAppointments: Appointment[] = [
  // Past — completadas y canceladas
  {
    id: "apt1",
    leadId: "5",
    leadName: "Lucía Justiniano",
    leadPhone: "+591 78887890",
    propertyId: "5",
    propertyTitle: "Oficina premium en Equipetrol Norte",
    date: "2026-03-20",
    time: "10:00",
    endTime: "11:00",
    status: "completada",
    notes: "Visitó y le encantó la oficina. Cerró la operación.",
    createdAt: "2026-03-15T11:00:00Z",
    confirmedAt: "2026-03-16T09:00:00Z",
    completedAt: "2026-03-20T11:00:00Z",
  },
  {
    id: "apt5",
    leadId: "6",
    leadName: "Andrés Salvatierra",
    leadPhone: "+591 69932222",
    propertyId: "4",
    propertyTitle: "Local comercial sobre Av. San Martín",
    date: "2026-03-25",
    time: "16:00",
    endTime: "17:00",
    status: "cancelada",
    createdAt: "2026-03-20T09:00:00Z",
    confirmedAt: "2026-03-21T10:00:00Z",
    cancelledAt: "2026-03-24T08:00:00Z",
  },
  // April 3 — today — 2 citas
  {
    id: "apt2",
    leadId: "1",
    leadName: "Carla Mendoza",
    leadPhone: "+591 78812345",
    propertyId: "1",
    propertyTitle: "Casa moderna en Equipetrol",
    date: "2026-04-03",
    time: "10:00",
    endTime: "11:00",
    status: "confirmada",
    createdAt: "2026-03-28T16:15:30Z",
    confirmedAt: "2026-03-29T18:00:00Z",
  },
  {
    id: "apt6",
    leadId: "8",
    leadName: "Mario Céspedes",
    leadPhone: "+591 60015555",
    propertyId: "5",
    propertyTitle: "Oficina premium en Equipetrol Norte",
    date: "2026-04-03",
    time: "15:00",
    endTime: "16:00",
    status: "confirmada",
    createdAt: "2026-03-30T10:00:00Z",
    confirmedAt: "2026-03-31T09:00:00Z",
  },
  // April 5 — 3 citas (multiples franjas)
  {
    id: "apt7",
    leadId: "1",
    leadName: "Carla Mendoza",
    leadPhone: "+591 78812345",
    propertyId: "6",
    propertyTitle: "PH reciclado en Las Palmas",
    date: "2026-04-05",
    time: "09:00",
    endTime: "10:00",
    status: "confirmada",
    createdAt: "2026-04-01T08:00:00Z",
    confirmedAt: "2026-04-01T12:00:00Z",
  },
  {
    id: "apt8",
    leadId: "2",
    leadName: "Fernando Rojas",
    leadPhone: "+591 70045678",
    propertyId: "1",
    propertyTitle: "Casa moderna en Equipetrol",
    date: "2026-04-05",
    time: "11:00",
    endTime: "12:00",
    status: "solicitada",
    createdAt: "2026-04-01T14:00:00Z",
  },
  {
    id: "apt9",
    leadId: "3",
    leadName: "Patricia Suárez",
    leadPhone: "+591 76690123",
    propertyId: "2",
    propertyTitle: "Departamento 2 amb en Norte",
    date: "2026-04-05",
    time: "16:00",
    endTime: "17:00",
    status: "solicitada",
    createdAt: "2026-04-02T09:00:00Z",
  },
  // April 7 — 1 cita
  {
    id: "apt3",
    leadId: "7",
    leadName: "Valentina Ruiz",
    leadPhone: "+591 75524444",
    propertyId: "2",
    propertyTitle: "Departamento 2 amb en Norte",
    date: "2026-04-07",
    time: "14:00",
    endTime: "15:00",
    status: "solicitada",
    createdAt: "2026-03-30T08:30:30Z",
  },
  // April 10 — 2 citas
  {
    id: "apt4",
    leadId: "4",
    leadName: "Hugo Chávez Peña",
    leadPhone: "+591 71134567",
    propertyId: "3",
    propertyTitle: "Terreno en Urubó",
    date: "2026-04-10",
    time: "11:00",
    endTime: "12:00",
    status: "solicitada",
    createdAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "apt10",
    leadId: "8",
    leadName: "Mario Céspedes",
    leadPhone: "+591 60015555",
    propertyId: "6",
    propertyTitle: "PH reciclado en Las Palmas",
    date: "2026-04-10",
    time: "15:00",
    endTime: "16:00",
    status: "confirmada",
    createdAt: "2026-04-02T11:00:00Z",
    confirmedAt: "2026-04-02T14:00:00Z",
  },
  // April 15 — 1 cita
  {
    id: "apt11",
    leadId: "2",
    leadName: "Fernando Rojas",
    leadPhone: "+591 70045678",
    propertyId: "3",
    propertyTitle: "Terreno en Urubó",
    date: "2026-04-15",
    time: "10:00",
    endTime: "11:30",
    status: "solicitada",
    createdAt: "2026-04-03T08:00:00Z",
  },
  // April 18 — 2 citas
  {
    id: "apt12",
    leadId: "3",
    leadName: "Patricia Suárez",
    leadPhone: "+591 76690123",
    propertyId: "1",
    propertyTitle: "Casa moderna en Equipetrol",
    date: "2026-04-18",
    time: "09:30",
    endTime: "10:30",
    status: "solicitada",
    createdAt: "2026-04-03T09:00:00Z",
  },
  {
    id: "apt13",
    leadId: "7",
    leadName: "Valentina Ruiz",
    leadPhone: "+591 75524444",
    propertyId: "6",
    propertyTitle: "PH reciclado en Las Palmas",
    date: "2026-04-18",
    time: "14:00",
    endTime: "15:00",
    status: "solicitada",
    createdAt: "2026-04-03T10:00:00Z",
  },
]

let appointments: Appointment[] = [...mockAppointments]
let appointmentCounter = mockAppointments.length

// ============================================================
// Mock Activities
// ============================================================

const mockActivities: BotActivity[] = [
  // Lead 1 — Carla Mendoza
  { id: "act1", leadId: "1", leadName: "Carla Mendoza", type: "lead_created", description: "Carla Mendoza se registró como lead desde Facebook", timestamp: "2026-02-20T14:30:00Z" },
  { id: "act2", leadId: "1", leadName: "Carla Mendoza", type: "message_sent", description: "Bot envió mensaje de bienvenida a Carla Mendoza", messageId: "m1", timestamp: "2026-02-20T14:31:00Z" },
  { id: "act3", leadId: "1", leadName: "Carla Mendoza", type: "property_sent", description: "Bot envió info de \"Casa moderna en Equipetrol\" a Carla Mendoza", propertyId: "1", messageId: "m2", timestamp: "2026-02-20T14:31:05Z" },
  { id: "act4", leadId: "1", leadName: "Carla Mendoza", type: "property_viewed", description: "Carla Mendoza vio la propiedad \"Casa moderna en Equipetrol\"", propertyId: "1", timestamp: "2026-02-20T14:35:00Z" },
  { id: "act5", leadId: "1", leadName: "Carla Mendoza", type: "message_received", description: "Carla Mendoza preguntó sobre metros cubiertos y la zona", messageId: "m3", timestamp: "2026-02-20T15:10:00Z" },
  { id: "act6", leadId: "1", leadName: "Carla Mendoza", type: "message_sent", description: "Bot respondió con detalles de la casa", messageId: "m4", timestamp: "2026-02-20T15:10:30Z" },
  { id: "act7", leadId: "1", leadName: "Carla Mendoza", type: "appointment_requested", description: "Carla Mendoza solicitó una visita para el fin de semana", appointmentId: "apt2", timestamp: "2026-02-20T16:15:00Z" },
  { id: "act8", leadId: "1", leadName: "Carla Mendoza", type: "appointment_confirmed", description: "Cita confirmada con Carla Mendoza para el 25/02 a las 10:00", appointmentId: "apt2", timestamp: "2026-02-20T18:00:00Z" },
  { id: "act9", leadId: "1", leadName: "Carla Mendoza", type: "reminder_sent", description: "Recordatorio enviado a Carla Mendoza para la cita de mañana", appointmentId: "apt2", timestamp: "2026-02-24T08:00:00Z" },

  // Lead 2 — Fernando Rojas
  { id: "act10", leadId: "2", leadName: "Fernando Rojas", type: "lead_created", description: "Fernando Rojas se registró como lead desde Instagram", timestamp: "2026-02-18T09:15:00Z" },
  { id: "act11", leadId: "2", leadName: "Fernando Rojas", type: "message_sent", description: "Bot envió mensaje de bienvenida a Fernando Rojas", messageId: "m9", timestamp: "2026-02-18T09:16:00Z" },
  { id: "act12", leadId: "2", leadName: "Fernando Rojas", type: "property_sent", description: "Bot envió info de \"Casa moderna en Equipetrol\" a Fernando Rojas", propertyId: "1", messageId: "m10", timestamp: "2026-02-18T09:16:05Z" },
  { id: "act13", leadId: "2", leadName: "Fernando Rojas", type: "property_viewed", description: "Fernando Rojas vio la propiedad \"Casa moderna en Equipetrol\"", propertyId: "1", timestamp: "2026-02-18T09:20:00Z" },
  { id: "act14", leadId: "2", leadName: "Fernando Rojas", type: "message_received", description: "Fernando Rojas preguntó por opciones en Urubó", messageId: "m11", timestamp: "2026-02-18T10:30:00Z" },
  { id: "act15", leadId: "2", leadName: "Fernando Rojas", type: "property_sent", description: "Bot envió \"Departamento 2 amb en Norte\" a Fernando Rojas", propertyId: "2", messageId: "m13", timestamp: "2026-02-18T10:30:35Z" },
  { id: "act16", leadId: "2", leadName: "Fernando Rojas", type: "property_sent", description: "Bot envió \"PH reciclado en Las Palmas\" a Fernando Rojas", propertyId: "6", messageId: "m14", timestamp: "2026-02-18T10:30:40Z" },
  { id: "act17", leadId: "2", leadName: "Fernando Rojas", type: "property_viewed", description: "Fernando Rojas vio \"Departamento 2 amb en Norte\"", propertyId: "2", timestamp: "2026-02-18T10:45:00Z" },

  // Lead 7 — Valentina Ruiz
  { id: "act18", leadId: "7", leadName: "Valentina Ruiz", type: "lead_created", description: "Valentina Ruiz se registró como lead desde Facebook", timestamp: "2026-02-22T07:45:00Z" },
  { id: "act19", leadId: "7", leadName: "Valentina Ruiz", type: "message_sent", description: "Bot envió mensaje de bienvenida a Valentina Ruiz", messageId: "m16", timestamp: "2026-02-22T07:46:00Z" },
  { id: "act20", leadId: "7", leadName: "Valentina Ruiz", type: "property_sent", description: "Bot envió info de \"Departamento 2 amb en Norte\" a Valentina Ruiz", propertyId: "2", messageId: "m17", timestamp: "2026-02-22T07:46:05Z" },
  { id: "act21", leadId: "7", leadName: "Valentina Ruiz", type: "property_viewed", description: "Valentina Ruiz vio \"Departamento 2 amb en Norte\"", propertyId: "2", timestamp: "2026-02-22T07:50:00Z" },
  { id: "act22", leadId: "7", leadName: "Valentina Ruiz", type: "message_received", description: "Valentina Ruiz solicitó agendar una visita", messageId: "m18", timestamp: "2026-02-22T08:30:00Z" },
  { id: "act23", leadId: "7", leadName: "Valentina Ruiz", type: "appointment_requested", description: "Valentina Ruiz solicitó cita para \"Departamento 2 amb en Norte\"", appointmentId: "apt3", timestamp: "2026-02-22T08:30:30Z" },
  { id: "act24", leadId: "7", leadName: "Valentina Ruiz", type: "property_sent", description: "Bot envió \"Cabaña en Samaipata\" como sugerencia a Valentina Ruiz", propertyId: "8", timestamp: "2026-02-22T09:00:00Z" },

  // Lead 4 — Hugo Chávez Peña
  { id: "act25", leadId: "4", leadName: "Hugo Chávez Peña", type: "lead_created", description: "Hugo Chávez Peña se registró como lead desde WhatsApp", timestamp: "2026-02-21T16:20:00Z" },
  { id: "act26", leadId: "4", leadName: "Hugo Chávez Peña", type: "property_sent", description: "Bot envió info de \"Terreno en Urubó\" a Hugo Chávez Peña", propertyId: "3", timestamp: "2026-02-21T16:21:00Z" },
  { id: "act27", leadId: "4", leadName: "Hugo Chávez Peña", type: "property_viewed", description: "Hugo Chávez Peña vio \"Terreno en Urubó\"", propertyId: "3", timestamp: "2026-02-21T17:00:00Z" },
  { id: "act28", leadId: "4", leadName: "Hugo Chávez Peña", type: "appointment_requested", description: "Hugo Chávez Peña solicitó cita para \"Terreno en Urubó\"", appointmentId: "apt4", timestamp: "2026-02-22T10:00:00Z" },

  // Lead 5 — Lucía Justiniano (ganado)
  { id: "act29", leadId: "5", leadName: "Lucía Justiniano", type: "lead_created", description: "Lucía Justiniano se registró como lead desde Instagram", timestamp: "2026-01-28T10:00:00Z" },
  { id: "act30", leadId: "5", leadName: "Lucía Justiniano", type: "property_sent", description: "Bot envió info de \"Oficina premium en Equipetrol Norte\" a Lucía Justiniano", propertyId: "5", timestamp: "2026-01-28T10:01:00Z" },
  { id: "act31", leadId: "5", leadName: "Lucía Justiniano", type: "appointment_confirmed", description: "Cita confirmada con Lucía Justiniano para el 01/02", appointmentId: "apt1", timestamp: "2026-01-29T09:00:00Z" },
  { id: "act32", leadId: "5", leadName: "Lucía Justiniano", type: "appointment_completed", description: "Cita con Lucía Justiniano completada. Cerró la operación.", appointmentId: "apt1", timestamp: "2026-02-01T11:00:00Z" },

  // Lead 6 — Andrés Salvatierra (cancelado)
  { id: "act33", leadId: "6", leadName: "Andrés Salvatierra", type: "appointment_cancelled", description: "Andrés Salvatierra canceló su cita para \"Local comercial sobre Av. San Martín\"", appointmentId: "apt5", timestamp: "2026-02-14T08:00:00Z" },
]

let activities: BotActivity[] = [...mockActivities]

// ============================================================
// Mock Notifications
// ============================================================

const mockNotifications: AgentNotification[] = [
  // 3 unread
  {
    id: "n1",
    type: "appointment_requested",
    title: "Nueva solicitud de cita",
    description: "Valentina Ruiz solicitó una cita para Departamento 2 amb en Norte",
    leadId: "7",
    appointmentId: "apt3",
    read: false,
    createdAt: "2026-02-22T08:30:30Z",
  },
  {
    id: "n2",
    type: "appointment_requested",
    title: "Nueva solicitud de cita",
    description: "Hugo Chávez Peña solicitó una cita para Terreno en Urubó",
    leadId: "4",
    appointmentId: "apt4",
    read: false,
    createdAt: "2026-02-22T10:00:00Z",
  },
  {
    id: "n3",
    type: "message_received",
    title: "Nuevo mensaje",
    description: "Valentina Ruiz envió un mensaje: \"Quiero agendar una visita lo antes posible\"",
    leadId: "7",
    read: false,
    createdAt: "2026-02-22T08:30:00Z",
  },
  // 5 read
  {
    id: "n4",
    type: "appointment_confirmed",
    title: "Cita confirmada",
    description: "Cita con Carla Mendoza confirmada para el 25/02 a las 10:00",
    leadId: "1",
    appointmentId: "apt2",
    read: true,
    createdAt: "2026-02-20T18:00:00Z",
  },
  {
    id: "n5",
    type: "reminder_sent",
    title: "Recordatorio enviado",
    description: "Se envió recordatorio a Carla Mendoza para la cita de mañana",
    leadId: "1",
    appointmentId: "apt2",
    read: true,
    createdAt: "2026-02-24T08:00:00Z",
  },
  {
    id: "n6",
    type: "lead_created",
    title: "Nuevo lead",
    description: "Valentina Ruiz se registró desde Facebook interesada en Departamento 2 amb en Norte",
    leadId: "7",
    read: true,
    createdAt: "2026-02-22T07:45:00Z",
  },
  {
    id: "n7",
    type: "appointment_completed",
    title: "Cita completada",
    description: "La cita con Lucía Justiniano se completó exitosamente",
    leadId: "5",
    appointmentId: "apt1",
    read: true,
    createdAt: "2026-02-01T11:00:00Z",
  },
  {
    id: "n8",
    type: "appointment_cancelled",
    title: "Cita cancelada",
    description: "Andrés Salvatierra canceló su cita para Local comercial sobre Av. San Martín",
    leadId: "6",
    appointmentId: "apt5",
    read: true,
    createdAt: "2026-02-14T08:00:00Z",
  },
]

let notifications: AgentNotification[] = [...mockNotifications]

// ============================================================
// Mock Bot Config
// ============================================================

let botConfig: BotConfig = { ...DEFAULT_BOT_CONFIG }

// ============================================================
// CRUD Functions
// ============================================================

// Messages
export async function getAllMessages(): Promise<BotMessage[]> {
  return Promise.resolve([...messages])
}

export async function getMessagesByLead(leadId: string): Promise<BotMessage[]> {
  return Promise.resolve(
    messages.filter((m) => m.leadId === leadId).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  )
}

// Activities
export async function getActivitiesByLead(leadId: string): Promise<BotActivity[]> {
  return Promise.resolve(
    activities.filter((a) => a.leadId === leadId).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  )
}

export async function getAllActivities(): Promise<BotActivity[]> {
  return Promise.resolve(
    [...activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  )
}

// Sent Properties
export async function getSentPropertiesByLead(leadId: string): Promise<SentProperty[]> {
  return Promise.resolve(sentProperties.filter((sp) => sp.leadId === leadId))
}

export async function getSentPropertiesAll(): Promise<SentProperty[]> {
  return Promise.resolve([...sentProperties])
}

// Appointments
export async function getAppointments(): Promise<Appointment[]> {
  return Promise.resolve([...appointments])
}

export async function getAppointmentsByLead(leadId: string): Promise<Appointment[]> {
  return Promise.resolve(appointments.filter((a) => a.leadId === leadId))
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  return Promise.resolve(appointments.filter((a) => a.date === date))
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const index = appointments.findIndex((a) => a.id === id)
  if (index === -1) throw new Error("Appointment not found")

  const now = new Date().toISOString()
  const updates: Partial<Appointment> = { status }

  if (status === "confirmada") updates.confirmedAt = now
  if (status === "completada") updates.completedAt = now
  if (status === "cancelada") updates.cancelledAt = now

  appointments[index] = { ...appointments[index], ...updates }
  return Promise.resolve(appointments[index])
}

export async function createAppointment(
  data: Omit<Appointment, "id" | "createdAt" | "status">
): Promise<Appointment> {
  const appointment: Appointment = {
    ...data,
    id: `apt${++appointmentCounter}`,
    status: "solicitada",
    createdAt: new Date().toISOString(),
  }
  appointments = [appointment, ...appointments]
  return Promise.resolve(appointment)
}

// Notifications
export async function getNotifications(): Promise<AgentNotification[]> {
  return Promise.resolve(
    [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )
}

export async function getUnreadNotificationCount(): Promise<number> {
  return Promise.resolve(notifications.filter((n) => !n.read).length)
}

export async function markNotificationRead(id: string): Promise<void> {
  const index = notifications.findIndex((n) => n.id === id)
  if (index !== -1) {
    notifications[index] = { ...notifications[index], read: true }
  }
  return Promise.resolve()
}

export async function markAllNotificationsRead(): Promise<void> {
  notifications = notifications.map((n) => ({ ...n, read: true }))
  return Promise.resolve()
}

// Bot Config
export async function getBotConfig(): Promise<BotConfig> {
  return Promise.resolve({ ...botConfig })
}

export async function updateBotConfig(data: Partial<BotConfig>): Promise<BotConfig> {
  botConfig = { ...botConfig, ...data }
  return Promise.resolve({ ...botConfig })
}
