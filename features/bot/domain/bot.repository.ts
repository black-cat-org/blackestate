import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  BotMessage,
  BotActivity,
  SentProperty,
  AgentNotification,
  BotConfig,
} from "./bot.entity"

export interface IBotRepository {
  // Messages
  getAllMessages(ctx: SessionContext): Promise<BotMessage[]>
  getMessagesByContact(ctx: SessionContext, contactId: string): Promise<BotMessage[]>

  // Activities
  getAllActivities(ctx: SessionContext): Promise<BotActivity[]>
  getActivitiesByContact(ctx: SessionContext, contactId: string): Promise<BotActivity[]>

  // Sent properties
  getSentPropertiesByContact(ctx: SessionContext, contactId: string): Promise<SentProperty[]>
  getSentPropertiesAll(ctx: SessionContext): Promise<SentProperty[]>

  // Notifications
  getNotifications(ctx: SessionContext): Promise<AgentNotification[]>
  getUnreadNotificationCount(ctx: SessionContext): Promise<number>
  markNotificationRead(ctx: SessionContext, id: string): Promise<void>
  markAllNotificationsRead(ctx: SessionContext): Promise<void>

  // Config
  getBotConfig(ctx: SessionContext): Promise<BotConfig>
  updateBotConfig(ctx: SessionContext, data: Partial<BotConfig>): Promise<BotConfig>
}
