export interface AgentProfile {
  name: string
  email: string
  whatsapp: string
  instagram: string
  facebook: string
  avatar: string
  bio: string
  website: string
}

export interface BusinessSettings {
  companyName: string
  currency: string
  monthlyGrowthTarget: number
  sameCommissionForAll: boolean
  defaultCommissionRate: number
  commissionByType: {
    venta: number
    alquiler: number
    anticretico: number
    temporal: number
  }
}

export type NotificationChannel = "email" | "whatsapp" | "push"

export interface NotificationEvent {
  id: string
  label: string
  description: string
  channels: Record<NotificationChannel, boolean>
}

export interface NotificationPreferences {
  events: NotificationEvent[]
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

export interface IntegrationSettings {
  whatsappConnected: boolean
}

export interface MarketingSettings {
  defaultHashtags: string[]
  emailSignature: string
  brochureColor: string
  aiLanguage: string
  watermarkEnabled: boolean
  watermarkText: string
}

export interface PlanInfo {
  name: string
  tier: "free" | "pro" | "enterprise"
  leadsUsed: number
  leadsLimit: number
  propertiesUsed: number
  propertiesLimit: number
  botMessagesUsed: number
  botMessagesLimit: number
  renewalDate: string
  price: number
}

export type SettingsSection = "profile" | "business" | "notifications" | "integrations" | "marketing" | "bot" | "plan"
