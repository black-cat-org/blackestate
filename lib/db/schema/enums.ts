import { pgEnum } from "drizzle-orm/pg-core";

// Properties
export const propertyTypeEnum = pgEnum("property_type", [
  "house", "apartment", "land", "commercial", "office", "warehouse", "cabin", "ph",
]);

export const operationTypeEnum = pgEnum("operation_type", [
  "venta", "alquiler", "temporal", "anticretico",
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "borrador", "en_revision", "activa", "pausada", "vendida", "alquilada", "rechazada",
]);

export const currencyEnum = pgEnum("currency", ["USD", "BOB"]);

export const surfaceUnitEnum = pgEnum("surface_unit", ["m2", "ha"]);

export const propertyConditionEnum = pgEnum("property_condition", [
  "nueva", "excelente", "buena", "regular", "a_reciclar",
]);

export const orientationEnum = pgEnum("orientation", [
  "norte", "sur", "este", "oeste", "noreste", "noroeste", "sureste", "suroeste",
]);

// Leads
export const leadStatusEnum = pgEnum("lead_status", [
  "nuevo", "contactado", "interesado", "ganado", "perdido", "descartado",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "facebook", "instagram", "whatsapp", "tiktok", "google", "referido", "directo",
]);

// Lead property queue
export const queueItemStatusEnum = pgEnum("queue_item_status", [
  "pendiente", "enviada", "pausada",
]);

// Appointments
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "solicitada", "confirmada", "completada", "cancelada",
]);

// Bot
export const conversationStatusEnum = pgEnum("conversation_status", [
  "activa", "pausada", "cerrada",
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
  "descripcion", "caption", "hashtags", "brochure",
]);

export const aiPlatformEnum = pgEnum("ai_platform", [
  "facebook", "instagram", "tiktok", "whatsapp",
]);
