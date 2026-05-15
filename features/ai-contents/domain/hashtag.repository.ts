import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Port (interface) for the per-org hashtag library. Returns
 * `string[]` (not an entity) because today the model is just a list
 * of tag strings — adding an entity wrapper before there are
 * structural fields (id, timestamps, etc.) would be dead code.
 *
 * R38d will introduce a `hashtag_library` table with
 * `{ id, organization_id, tag, created_at }` and at that point this
 * interface signature can switch to a `Hashtag[]` entity if the
 * extra metadata becomes useful to consumers.
 *
 * Mirror of `IAiContentRepository`: ctx-first method signatures so
 * adapter swaps in R38b/R38d are zero-churn at the interface level.
 */
export interface IHashtagRepository {
  findAll(ctx: SessionContext): Promise<string[]>
  add(ctx: SessionContext, tag: string): Promise<void>
  remove(ctx: SessionContext, tag: string): Promise<void>
  addMany(ctx: SessionContext, tags: string[]): Promise<void>
}
