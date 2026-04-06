import { User, Briefcase, Bell, Plug, Megaphone, Bot, CreditCard } from "lucide-react"
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
  { key: "profile", label: "Perfil", icon: User, description: "Información personal y de contacto" },
  { key: "business", label: "Negocio", icon: Briefcase, description: "Comisiones, moneda y datos fiscales" },
  { key: "notifications", label: "Notificaciones", icon: Bell, description: "Canales, eventos y horarios" },
  { key: "integrations", label: "Integraciones", icon: Plug, description: "WhatsApp, redes sociales y APIs" },
  { key: "marketing", label: "Marketing", icon: Megaphone, description: "Hashtags, firma y branding" },
  { key: "bot", label: "Mi Bot", icon: Bot, description: "Configuración del asistente virtual" },
  { key: "plan", label: "Plan y Facturación", icon: CreditCard, description: "Tu plan actual y uso" },
]

export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  name: "Gonzalo Pinell",
  email: "gonzalo@blackestate.com",
  phone: "+54 11 5555-1234",
  avatar: "",
  bio: "Agente inmobiliario con más de 10 años de experiencia en el mercado residencial y comercial de Buenos Aires.",
  licenseNumber: "CUCICBA-1234",
  website: "https://blackestate.com",
  address: "Av. Santa Fe 1234, CABA, Argentina",
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  companyName: "Black Estate",
  defaultCommissionRate: 3,
  currency: "USD",
  taxRate: 21,
  fiscalId: "20-12345678-9",
  defaultOperationType: "venta",
  monthlyGrowthTarget: 10,
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: {
    email: true,
    whatsapp: true,
    push: false,
  },
  events: {
    newLead: true,
    appointmentCreated: true,
    appointmentReminder: true,
    propertySold: true,
    weeklyReport: false,
  },
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
}

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  whatsappNumber: "+54 9 11 1234-5678",
  whatsappConnected: true,
  instagram: "@blackestate",
  facebook: "blackestate",
  googleMapsApiKey: "",
  webhookUrl: "",
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
