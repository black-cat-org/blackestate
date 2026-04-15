import type { AgentNotification } from "@/features/bot/domain/bot.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleBotRepository } from "@/features/bot/infrastructure/drizzle-bot.repository"

export async function getNotificationsUseCase(
  ctx: SessionContext,
): Promise<AgentNotification[]> {
  const repo = new DrizzleBotRepository()
  return repo.getNotifications(ctx)
}

export async function getUnreadNotificationCountUseCase(
  ctx: SessionContext,
): Promise<number> {
  const repo = new DrizzleBotRepository()
  return repo.getUnreadNotificationCount(ctx)
}

export async function markNotificationReadUseCase(
  ctx: SessionContext,
  id: string,
): Promise<void> {
  const repo = new DrizzleBotRepository()
  return repo.markNotificationRead(ctx, id)
}

export async function markAllNotificationsReadUseCase(
  ctx: SessionContext,
): Promise<void> {
  const repo = new DrizzleBotRepository()
  return repo.markAllNotificationsRead(ctx)
}
