import type { BotConfig } from "@/features/bot/domain/bot.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleBotRepository } from "@/features/bot/infrastructure/drizzle-bot.repository"

export async function getBotConfigUseCase(
  ctx: SessionContext,
): Promise<BotConfig> {
  const repo = new DrizzleBotRepository()
  return repo.getBotConfig(ctx)
}

export async function updateBotConfigUseCase(
  ctx: SessionContext,
  data: Partial<BotConfig>,
): Promise<BotConfig> {
  const repo = new DrizzleBotRepository()
  return repo.updateBotConfig(ctx, data)
}
