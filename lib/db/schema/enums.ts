import { pgEnum } from "drizzle-orm/pg-core";

// Properties
export const propertyTypeEnum = pgEnum("property_type", [
  "house", "apartment", "land", "commercial", "office", "warehouse", "cabin", "ph",
]);

export const operationTypeEnum = pgEnum("operation_type", [
  "sale", "rent", "short_term", "antichretic",
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

// ─── Multitenancy (Supabase Auth migration) ───────────────────────────────

// Role assigned to a user within an organization.
export const memberRoleEnum = pgEnum("member_role", [
  "owner", "admin", "agent",
]);

// Commercial plan of an organization — drives seat limit and feature flags.
export const organizationPlanEnum = pgEnum("organization_plan", [
  "free", "pro", "enterprise",
]);

// Lifecycle of an invitation sent to join an organization.
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending", "accepted", "rejected", "expired", "cancelled",
]);

// Fine-grained permissions bound to roles via public.role_permissions.
// Values mirror the Better Auth permissions in lib/auth-permissions.ts so the
// migration preserves identical authorization semantics.
export const appPermissionEnum = pgEnum("app_permission", [
  "property.create",
  "property.read_own",
  "property.read_all",
  "property.edit_own",
  "property.edit_all",
  "property.delete_own",
  "property.delete_all",
  "property.assign",
  "lead.create",
  "lead.read_own",
  "lead.read_all",
  "lead.edit_own",
  "lead.edit_all",
  "lead.delete_own",
  "lead.delete_all",
  "lead.assign",
  "analytics.read_own",
  "analytics.read_all",
  "bot.read",
  "bot.configure",
  "settings.read",
  "settings.manage",
  "billing.manage",
]);
