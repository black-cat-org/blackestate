export interface AgentProfile {
  name: string
  email: string
  phone: string
  avatar: string
  bio: string
  licenseNumber: string
  website: string
  address: string
}

export interface BusinessSettings {
  companyName: string
  defaultCommissionRate: number
  currency: string
  taxRate: number
  fiscalId: string
  defaultOperationType: string
  monthlyGrowthTarget: number
}

export interface NotificationPreferences {
  channels: {
    email: boolean
    whatsapp: boolean
    push: boolean
  }
  events: {
    newLead: boolean
    appointmentCreated: boolean
    appointmentReminder: boolean
    propertySold: boolean
    weeklyReport: boolean
  }
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

export interface IntegrationSettings {
  whatsappNumber: string
  whatsappConnected: boolean
  instagram: string
  facebook: string
  googleMapsApiKey: string
  webhookUrl: string
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
