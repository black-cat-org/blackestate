import type { BotMessage } from "@/features/bot/domain/bot.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleBotRepository } from "@/features/bot/infrastructure/drizzle-bot.repository"

export async function getAllMessagesUseCase(
  ctx: SessionContext,
): Promise<BotMessage[]> {
  const repo = new DrizzleBotRepository()
  return repo.getAllMessages(ctx)
}

export async function getMessagesByContactUseCase(
  ctx: SessionContext,
  contactId: string,
): Promise<BotMessage[]> {
  const repo = new DrizzleBotRepository()
  return repo.getMessagesByContact(ctx, contactId)
}
