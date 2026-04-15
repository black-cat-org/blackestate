"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getAllMessagesUseCase, getMessagesByLeadUseCase } from "@/features/bot/application/get-messages.use-case"
import { getAllActivitiesUseCase, getActivitiesByLeadUseCase } from "@/features/bot/application/get-activities.use-case"
import { getSentPropertiesByLeadUseCase, getSentPropertiesAllUseCase } from "@/features/bot/application/get-sent-properties.use-case"
import { getNotificationsUseCase, getUnreadNotificationCountUseCase, markNotificationReadUseCase, markAllNotificationsReadUseCase } from "@/features/bot/application/manage-notifications.use-case"
import { getBotConfigUseCase, updateBotConfigUseCase } from "@/features/bot/application/manage-config.use-case"
import type { BotMessage, BotActivity, SentProperty, AgentNotification, BotConfig } from "@/features/bot/domain/bot.entity"

// ---------------------------------------------------------------------------
// Authenticated actions (require session context)
// ---------------------------------------------------------------------------

// Messages

export async function getAllMessagesAction(): Promise<BotMessage[]> {
  const ctx = await getSessionContext()
  return getAllMessagesUseCase(ctx)
}

export async function getMessagesByLeadAction(
  leadId: string,
): Promise<BotMessage[]> {
  const ctx = await getSessionContext()
  return getMessagesByLeadUseCase(ctx, leadId)
}

// Activities

export async function getAllActivitiesAction(): Promise<BotActivity[]> {
  const ctx = await getSessionContext()
  return getAllActivitiesUseCase(ctx)
}

export async function getActivitiesByLeadAction(
  leadId: string,
): Promise<BotActivity[]> {
  const ctx = await getSessionContext()
  return getActivitiesByLeadUseCase(ctx, leadId)
}

// Sent properties

export async function getSentPropertiesByLeadAction(
  leadId: string,
): Promise<SentProperty[]> {
  const ctx = await getSessionContext()
  return getSentPropertiesByLeadUseCase(ctx, leadId)
}

export async function getSentPropertiesAllAction(): Promise<SentProperty[]> {
  const ctx = await getSessionContext()
  return getSentPropertiesAllUseCase(ctx)
}

// Notifications

export async function getNotificationsAction(): Promise<AgentNotification[]> {
  const ctx = await getSessionContext()
  return getNotificationsUseCase(ctx)
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const ctx = await getSessionContext()
  return getUnreadNotificationCountUseCase(ctx)
}

export async function markNotificationReadAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return markNotificationReadUseCase(ctx, id)
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const ctx = await getSessionContext()
  return markAllNotificationsReadUseCase(ctx)
}

// Config

export async function getBotConfigAction(): Promise<BotConfig> {
  const ctx = await getSessionContext()
  return getBotConfigUseCase(ctx)
}

export async function updateBotConfigAction(
  data: Partial<BotConfig>,
): Promise<BotConfig> {
  const ctx = await getSessionContext()
  return updateBotConfigUseCase(ctx, data)
}
