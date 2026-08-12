import type { SentProperty } from "@/features/bot/domain/bot.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleBotRepository } from "@/features/bot/infrastructure/drizzle-bot.repository"

export async function getSentPropertiesByContactUseCase(
  ctx: SessionContext,
  contactId: string,
): Promise<SentProperty[]> {
  const repo = new DrizzleBotRepository()
  return repo.getSentPropertiesByContact(ctx, contactId)
}

export async function getSentPropertiesAllUseCase(
  ctx: SessionContext,
): Promise<SentProperty[]> {
  const repo = new DrizzleBotRepository()
  return repo.getSentPropertiesAll(ctx)
}
