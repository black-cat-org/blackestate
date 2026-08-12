import type { aiContents } from "@/lib/db/schema"

/**
 * Drizzle-inferred row types for the `ai_contents` table. Owned by
 * the feature-infrastructure layer per the project convention
 * established by `features/inquiries/infrastructure/inquiry.model.ts`.
 *
 * The schema file (`lib/db/schema/ai-contents.ts`) describes the DB
 * shape; this feature layer derives its own `Row` / `Insert` aliases
 * from it. These types are consumed by the mapper (R38d) and the
 * repository adapter (R38d). They are NOT the domain entity
 * (`features/ai-contents/domain/ai-content.entity.ts`) — the domain
 * version uses `undefined` for nullable fields while the row uses
 * `null`. The mapper bridges the two boundaries.
 */
export type AiContentRow = typeof aiContents.$inferSelect
export type AiContentInsert = typeof aiContents.$inferInsert
