"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getAllMessagesUseCase, getMessagesByContactUseCase } from "@/features/bot/application/get-messages.use-case"
import { getAllActivitiesUseCase, getActivitiesByContactUseCase } from "@/features/bot/application/get-activities.use-case"
import { getSentPropertiesByContactUseCase, getSentPropertiesAllUseCase } from "@/features/bot/application/get-sent-properties.use-case"
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

export async function getMessagesByContactAction(
  contactId: string,
): Promise<BotMessage[]> {
  const ctx = await getSessionContext()
  return getMessagesByContactUseCase(ctx, contactId)
}

// Activities

export async function getAllActivitiesAction(): Promise<BotActivity[]> {
  const ctx = await getSessionContext()
  return getAllActivitiesUseCase(ctx)
}

export async function getActivitiesByContactAction(
  contactId: string,
): Promise<BotActivity[]> {
  const ctx = await getSessionContext()
  return getActivitiesByContactUseCase(ctx, contactId)
}

// Sent properties

export async function getSentPropertiesByContactAction(
  contactId: string,
): Promise<SentProperty[]> {
  const ctx = await getSessionContext()
  return getSentPropertiesByContactUseCase(ctx, contactId)
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
