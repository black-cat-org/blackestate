import type {
  AgentProfile,
  BusinessSettings,
  NotificationPreferences,
  IntegrationSettings,
  MarketingSettings,
  PlanInfo,
} from "@/features/settings/domain/settings.entity"
import {
  DEFAULT_AGENT_PROFILE,
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_INTEGRATION_SETTINGS,
  DEFAULT_MARKETING_SETTINGS,
  DEFAULT_PLAN_INFO,
} from "@/lib/constants/settings"

// Mutable in-memory state
let agentProfile: AgentProfile = { ...DEFAULT_AGENT_PROFILE }
let businessSettings: BusinessSettings = { ...DEFAULT_BUSINESS_SETTINGS }
let notificationPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES }
let integrationSettings: IntegrationSettings = { ...DEFAULT_INTEGRATION_SETTINGS }
let marketingSettings: MarketingSettings = { ...DEFAULT_MARKETING_SETTINGS }
const planInfo: PlanInfo = { ...DEFAULT_PLAN_INFO }

// Getters
export async function getAgentProfile(): Promise<AgentProfile> {
  return Promise.resolve({ ...agentProfile })
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  return Promise.resolve({ ...businessSettings })
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return Promise.resolve({ ...notificationPreferences })
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  return Promise.resolve({ ...integrationSettings })
}

export async function getMarketingSettings(): Promise<MarketingSettings> {
  return Promise.resolve({ ...marketingSettings, defaultHashtags: [...marketingSettings.defaultHashtags] })
}

export async function getPlanInfo(): Promise<PlanInfo> {
  return Promise.resolve({ ...planInfo })
}

// Updaters
export async function updateAgentProfile(data: Partial<AgentProfile>): Promise<AgentProfile> {
  agentProfile = { ...agentProfile, ...data }
  return Promise.resolve({ ...agentProfile })
}

export async function updateBusinessSettings(data: Partial<BusinessSettings>): Promise<BusinessSettings> {
  businessSettings = { ...businessSettings, ...data }
  return Promise.resolve({ ...businessSettings })
}

export async function updateNotificationPreferences(data: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  notificationPreferences = {
    ...notificationPreferences,
    ...data,
  }
  return Promise.resolve({ ...notificationPreferences })
}

export async function updateIntegrationSettings(data: Partial<IntegrationSettings>): Promise<IntegrationSettings> {
  integrationSettings = { ...integrationSettings, ...data }
  return Promise.resolve({ ...integrationSettings })
}

export async function updateMarketingSettings(data: Partial<MarketingSettings>): Promise<MarketingSettings> {
  marketingSettings = { ...marketingSettings, ...data }
  return Promise.resolve({ ...marketingSettings, defaultHashtags: [...marketingSettings.defaultHashtags] })
}
