import type {
  BotMessage,
  BotConfig,
  BotScheduleDay,
} from "@/features/bot/domain/bot.entity"
import type { MessageRow, ConfigRow } from "./bot.model"

// ---------------------------------------------------------------------------
// MessageRow (DB) -> BotMessage (domain)
// ---------------------------------------------------------------------------

export function mapMessageRowToEntity(
  row: MessageRow,
  leadId: string,
): BotMessage {
  return {
    id: row.id,
    leadId,
    sender: row.sender,
    contentType: row.contentType,
    text: row.text,
    mediaUrl: row.mediaUrl ?? undefined,
    propertyId: row.propertyId ?? undefined,
    status: row.status,
    timestamp: row.createdAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// ConfigRow (DB) -> BotConfig (domain)
// ---------------------------------------------------------------------------

export function mapConfigRowToEntity(row: ConfigRow): BotConfig {
  return {
    active: row.active,
    schedule: row.schedule as Record<string, BotScheduleDay>,
    welcomeMessage: row.welcomeMessage,
    appointmentDuration: row.appointmentDuration,
    reminderHoursBefore: row.reminderHoursBefore,
    notifications: row.notifications as BotConfig["notifications"],
  }
}
