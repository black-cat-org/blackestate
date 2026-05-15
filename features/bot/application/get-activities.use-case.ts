import type { BotActivity } from "@/features/bot/domain/bot.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleBotRepository } from "@/features/bot/infrastructure/drizzle-bot.repository"

export async function getAllActivitiesUseCase(
  ctx: SessionContext,
): Promise<BotActivity[]> {
  const repo = new DrizzleBotRepository()
  return repo.getAllActivities(ctx)
}

export async function getActivitiesByContactUseCase(
  ctx: SessionContext,
  contactId: string,
): Promise<BotActivity[]> {
  const repo = new DrizzleBotRepository()
  return repo.getActivitiesByContact(ctx, contactId)
}
