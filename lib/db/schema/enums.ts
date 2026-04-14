import { pgEnum } from "drizzle-orm/pg-core";

// Properties
export const propertyTypeEnum = pgEnum("property_type", [
  "house", "apartment", "land", "commercial", "office", "warehouse", "cabin", "ph",
]);

export const operationTypeEnum = pgEnum("operation_type", [
  "sale", "rent", "short_term", "anticretico",
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "draft", "in_review", "active", "paused", "sold", "rented", "rejected",
]);

export const currencyEnum = pgEnum("currency", ["USD", "BOB"]);

export const surfaceUnitEnum = pgEnum("surface_unit", ["m2", "ha"]);

export const propertyConditionEnum = pgEnum("property_condition", [
  "new", "excellent", "good", "fair", "to_renovate",
]);

export const orientationEnum = pgEnum("orientation", [
  "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest",
]);

// Leads
export const leadStatusEnum = pgEnum("lead_status", [
  "new", "contacted", "interested", "won", "lost", "discarded",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "facebook", "instagram", "whatsapp", "tiktok", "google", "referral", "direct",
]);

// Lead property queue
export const queueItemStatusEnum = pgEnum("queue_item_status", [
  "pending", "sent", "paused",
]);

// Appointments
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "requested", "confirmed", "completed", "cancelled",
]);

// Bot
export const conversationStatusEnum = pgEnum("conversation_status", [
  "active", "paused", "closed",
]);

export const messageSenderEnum = pgEnum("message_sender", [
  "bot", "client", "agent",
]);

export const messageContentTypeEnum = pgEnum("message_content_type", [
  "text", "image", "pdf", "property_card",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "sent", "delivered", "read",
]);

// AI Contents
export const aiContentTypeEnum = pgEnum("ai_content_type", [
  "description", "caption", "hashtags", "brochure",
]);

export const aiPlatformEnum = pgEnum("ai_platform", [
  "facebook", "instagram", "tiktok", "whatsapp",
]);
