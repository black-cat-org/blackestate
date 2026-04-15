"use server"

import {
  getAgentProfile,
  getBusinessSettings,
  getNotificationPreferences,
  getIntegrationSettings,
  getMarketingSettings,
  getPlanInfo,
  updateAgentProfile,
  updateBusinessSettings,
  updateNotificationPreferences,
  updateIntegrationSettings,
  updateMarketingSettings,
} from "@/features/settings/infrastructure/settings.service"
import type {
  AgentProfile,
  BusinessSettings,
  NotificationPreferences,
  IntegrationSettings,
  MarketingSettings,
  PlanInfo,
} from "@/features/settings/domain/settings.entity"

export async function getAgentProfileAction(): Promise<AgentProfile> {
  return getAgentProfile()
}

export async function getBusinessSettingsAction(): Promise<BusinessSettings> {
  return getBusinessSettings()
}

export async function getNotificationPreferencesAction(): Promise<NotificationPreferences> {
  return getNotificationPreferences()
}

export async function getIntegrationSettingsAction(): Promise<IntegrationSettings> {
  return getIntegrationSettings()
}

export async function getMarketingSettingsAction(): Promise<MarketingSettings> {
  return getMarketingSettings()
}

export async function getPlanInfoAction(): Promise<PlanInfo> {
  return getPlanInfo()
}

export async function updateAgentProfileAction(data: Partial<AgentProfile>): Promise<AgentProfile> {
  return updateAgentProfile(data)
}

export async function updateBusinessSettingsAction(data: Partial<BusinessSettings>): Promise<BusinessSettings> {
  return updateBusinessSettings(data)
}

export async function updateNotificationPreferencesAction(data: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  return updateNotificationPreferences(data)
}

export async function updateIntegrationSettingsAction(data: Partial<IntegrationSettings>): Promise<IntegrationSettings> {
  return updateIntegrationSettings(data)
}

export async function updateMarketingSettingsAction(data: Partial<MarketingSettings>): Promise<MarketingSettings> {
  return updateMarketingSettings(data)
}
