import { eq, and, isNull } from "drizzle-orm"

import type { IBotRepository } from "@/features/bot/domain/bot.repository"
import type {
  BotMessage,
  BotActivity,
  SentProperty,
  AgentNotification,
  BotConfig,
} from "@/features/bot/domain/bot.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { botMessages, botConversations, botConfig } from "@/lib/db/schema"
import { DEFAULT_BOT_CONFIG } from "@/lib/constants/bot"
import { mapMessageRowToEntity, mapConfigRowToEntity } from "./bot.mapper"

export class DrizzleBotRepository implements IBotRepository {
  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  async getAllMessages(ctx: SessionContext): Promise<BotMessage[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          message: botMessages,
          leadId: botConversations.leadId,
        })
        .from(botMessages)
        .leftJoin(
          botConversations,
          eq(botMessages.conversationId, botConversations.id),
        )
        .where(isNull(botMessages.deletedAt))
    })

    return rows.map((r) =>
      mapMessageRowToEntity(r.message, r.leadId ?? ""),
    )
  }

  async getMessagesByLead(
    ctx: SessionContext,
    leadId: string,
  ): Promise<BotMessage[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          message: botMessages,
          leadId: botConversations.leadId,
        })
        .from(botMessages)
        .leftJoin(
          botConversations,
          eq(botMessages.conversationId, botConversations.id),
        )
        .where(
          and(
            eq(botConversations.leadId, leadId),
            isNull(botMessages.deletedAt),
          ),
        )
    })

    return rows.map((r) =>
      mapMessageRowToEntity(r.message, r.leadId ?? leadId),
    )
  }

  // ---------------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------------

  async getAllActivities(_ctx: SessionContext): Promise<BotActivity[]> {
    // TODO: implement when dedicated bot_activities table exists
    return []
  }

  async getActivitiesByLead(
    _ctx: SessionContext,
    _leadId: string,
  ): Promise<BotActivity[]> {
    // TODO: implement when dedicated bot_activities table exists
    return []
  }

  // ---------------------------------------------------------------------------
  // Sent properties
  // ---------------------------------------------------------------------------

  async getSentPropertiesByLead(
    _ctx: SessionContext,
    _leadId: string,
  ): Promise<SentProperty[]> {
    // TODO: implement when dedicated bot_sent_properties table exists
    return []
  }

  async getSentPropertiesAll(_ctx: SessionContext): Promise<SentProperty[]> {
    // TODO: implement when dedicated bot_sent_properties table exists
    return []
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  async getNotifications(_ctx: SessionContext): Promise<AgentNotification[]> {
    // TODO: implement when dedicated agent_notifications table exists
    return []
  }

  async getUnreadNotificationCount(_ctx: SessionContext): Promise<number> {
    // TODO: implement when dedicated agent_notifications table exists
    return 0
  }

  async markNotificationRead(
    _ctx: SessionContext,
    _id: string,
  ): Promise<void> {
    // TODO: implement when dedicated agent_notifications table exists
  }

  async markAllNotificationsRead(_ctx: SessionContext): Promise<void> {
    // TODO: implement when dedicated agent_notifications table exists
  }

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  async getBotConfig(ctx: SessionContext): Promise<BotConfig> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select()
        .from(botConfig)
        .where(
          and(
            eq(botConfig.organizationId, ctx.orgId),
            isNull(botConfig.deletedAt),
          ),
        )
        .limit(1)
    })

    if (rows.length === 0) {
      return { ...DEFAULT_BOT_CONFIG }
    }

    return mapConfigRowToEntity(rows[0])
  }

  async updateBotConfig(
    ctx: SessionContext,
    data: Partial<BotConfig>,
  ): Promise<BotConfig> {
    return withRLS(ctx, async (tx) => {
      // Check if config exists for this org
      const existing = await tx
        .select({ id: botConfig.id })
        .from(botConfig)
        .where(
          and(
            eq(botConfig.organizationId, ctx.orgId),
            isNull(botConfig.deletedAt),
          ),
        )
        .limit(1)

      if (existing.length > 0) {
        // Update existing config
        const rows = await tx
          .update(botConfig)
          .set({
            ...(data.active !== undefined && { active: data.active }),
            ...(data.welcomeMessage !== undefined && {
              welcomeMessage: data.welcomeMessage,
            }),
            ...(data.appointmentDuration !== undefined && {
              appointmentDuration: data.appointmentDuration,
            }),
            ...(data.reminderHoursBefore !== undefined && {
              reminderHoursBefore: data.reminderHoursBefore,
            }),
            ...(data.schedule !== undefined && { schedule: data.schedule }),
            ...(data.notifications !== undefined && {
              notifications: data.notifications,
            }),
          })
          .where(eq(botConfig.id, existing[0].id))
          .returning()

        return mapConfigRowToEntity(rows[0])
      }

      // Insert new config (upsert)
      const merged = { ...DEFAULT_BOT_CONFIG, ...data }
      const rows = await tx
        .insert(botConfig)
        .values({
          organizationId: ctx.orgId,
          active: merged.active,
          welcomeMessage: merged.welcomeMessage,
          appointmentDuration: merged.appointmentDuration,
          reminderHoursBefore: merged.reminderHoursBefore,
          schedule: merged.schedule,
          notifications: merged.notifications,
        })
        .returning()

      return mapConfigRowToEntity(rows[0])
    })
  }
}
