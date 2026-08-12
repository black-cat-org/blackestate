import type {
  AiContent,
  AiContentAnalytics,
} from "@/features/ai-contents/domain/ai-content.entity"
import type { AiContentRow } from "./ai-content.model"

// ---------------------------------------------------------------------------
// Model (DB row, uses null) → Entity (domain, uses undefined)
// ---------------------------------------------------------------------------
//
// `type`, `platform`, `publishedTo` are stored as Postgres enums
// (`ai_content_type`, `ai_platform`), so the DB constraint guarantees
// only valid union members reach this mapper. No runtime whitelist
// needed.
//
// `propertyTitle` is denormalized from a LEFT JOIN against `properties`
// at the repository layer — the caller supplies it through the
// `joins` arg (mirror of `mapInquiryRowWithJoinsToEntity`). If the
// join fails (property soft-deleted upstream) the field falls back
// to the placeholder so the UI never renders an empty string.

/**
 * Spanish-neutral fallback shown when an AiContent row's joined
 * Property has been soft-deleted or otherwise hidden by RLS. Keeps
 * the AI content card legible without surfacing a broken state.
 */
export const FALLBACK_PROPERTY_TITLE = "Sin propiedad"

export interface AiContentJoinedFields {
  propertyTitle?: string
}

export function mapAiContentRowToEntity(
  row: AiContentRow,
  joins: AiContentJoinedFields = {},
): AiContent {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    propertyId: row.propertyId,
    propertyTitle: joins.propertyTitle ?? FALLBACK_PROPERTY_TITLE,
    type: row.type,
    platform: row.platform ?? undefined,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString(),
    publishedTo: row.publishedTo ?? undefined,
    analytics: (row.analytics as AiContentAnalytics | null) ?? undefined,
  }
}
