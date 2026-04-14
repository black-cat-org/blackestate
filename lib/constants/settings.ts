import { User, Briefcase, Bell, Plug, Bot, CreditCard } from "lucide-react"
import type {
  SettingsSection,
  AgentProfile,
  BusinessSettings,
  NotificationPreferences,
  IntegrationSettings,
  MarketingSettings,
  PlanInfo,
} from "@/lib/types/settings"

export const SETTINGS_SECTIONS: { key: SettingsSection; label: string; icon: typeof User; description: string }[] = [
  { key: "business", label: "Negocio", icon: Briefcase, description: "Empresa, moneda y comisiones" },
  { key: "notifications", label: "Notificaciones", icon: Bell, description: "Canales, eventos y horarios" },
  { key: "integrations", label: "Integraciones", icon: Plug, description: "Conexiones con servicios externos" },
  { key: "bot", label: "Mi Bot", icon: Bot, description: "Configuración del asistente virtual" },
  { key: "plan", label: "Plan y Facturación", icon: CreditCard, description: "Tu plan actual y uso" },
]

export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  name: "Gonzalo Pinell",
  email: "gonzalo@blackestate.com",
  whatsapp: "+591 78812345",
  instagram: "@gonzalopinell.realestate",
  facebook: "Gonzalo Pinell Bienes Raíces",
  avatar: "",
  bio: "Agente inmobiliario con más de 10 años de experiencia en el mercado residencial y comercial de Santa Cruz de la Sierra.",
  website: "https://blackestate.com",
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  companyName: "Black Estate",
  currency: "USD",
  monthlyGrowthTarget: 10,
  sameCommissionForAll: true,
  defaultCommissionRate: 3,
  commissionByType: {
    sale: 3,
    rent: 100,
    anticretico: 3,
    short_term: 100,
  },
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  events: [
    { id: "newLead", label: "Nuevo lead registrado", description: "Cuando alguien se contacta por primera vez", channels: { email: false, whatsapp: true, push: true } },
    { id: "leadStale", label: "Lead sin contactar", description: "Cuando un lead lleva más de 48h sin ser contactado", channels: { email: false, whatsapp: true, push: true } },
    { id: "appointmentRequested", label: "Cita solicitada", description: "Cuando el bot agenda una nueva cita", channels: { email: false, whatsapp: true, push: true } },
    { id: "appointmentConfirmed", label: "Cita confirmada", description: "Cuando confirmas una cita", channels: { email: true, whatsapp: false, push: false } },
    { id: "appointmentReminder", label: "Cita próxima", description: "Recordatorio antes de una cita", channels: { email: false, whatsapp: true, push: true } },
    { id: "propertyClosed", label: "Propiedad vendida/alquilada", description: "Cuando se cierra una operación", channels: { email: true, whatsapp: true, push: true } },
    { id: "catalogOpened", label: "Cliente abrió el catálogo", description: "Cuando un lead abre el link del catálogo", channels: { email: false, whatsapp: true, push: false } },
    { id: "clientMessage", label: "Mensaje del cliente", description: "Cuando un lead responde un mensaje", channels: { email: false, whatsapp: true, push: true } },
    { id: "weeklyReport", label: "Reporte semanal", description: "Resumen de tu actividad de la semana", channels: { email: true, whatsapp: false, push: false } },
  ],
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
}

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  whatsappConnected: true,
}

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  defaultHashtags: ["#BlackEstate", "#Inmobiliaria", "#BuenosAires", "#PropiedadesEnVenta"],
  emailSignature: "Gonzalo Pinell\nBlack Estate\n+54 11 5555-1234\nwww.blackestate.com",
  brochureColor: "#000000",
  aiLanguage: "es",
  watermarkEnabled: true,
  watermarkText: "Black Estate",
}

export const DEFAULT_PLAN_INFO: PlanInfo = {
  name: "Pro",
  tier: "pro",
  leadsUsed: 47,
  leadsLimit: 100,
  propertiesUsed: 12,
  propertiesLimit: 50,
  botMessagesUsed: 1250,
  botMessagesLimit: 5000,
  renewalDate: "2026-03-15",
  price: 49,
}
