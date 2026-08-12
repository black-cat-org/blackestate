import type { hashtagLibrary } from "@/lib/db/schema"

/**
 * Drizzle-inferred row types for the `hashtag_library` table. Mirrors
 * the `AiContentRow`/`AiContentInsert` pattern from `ai-content.model.ts`.
 *
 * The repository API exposes `string[]` (just the tag value) to the
 * application/presentation layers — the Row type lives only inside
 * the adapter for INSERT/UPDATE shape inference. When the UI starts
 * needing per-tag metadata (id, createdAt, createdBy), a separate
 * `Hashtag` domain entity can materialize without breaking the
 * existing repository contract.
 */
export type HashtagRow = typeof hashtagLibrary.$inferSelect
export type HashtagInsert = typeof hashtagLibrary.$inferInsert
