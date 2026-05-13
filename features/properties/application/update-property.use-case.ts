import type { Property } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"
import { extractStoragePath } from "@/lib/supabase/storage-utils"

interface UpdatePropertyOptions {
  /**
   * Best-effort batch delete of property-media storage objects by path.
   *
   * Injected by the presentation layer so the use case stays free of
   * Supabase types — same pattern used by `uploadAvatarUseCase` and
   * `removeAvatarUseCase`. Callers without a storage client (background
   * jobs, tests, future Inngest workers) simply omit it; orphan cleanup
   * is then deferred to the bucket cleanup cron (TPD-6).
   *
   * Batch (vs per-path) so a multi-photo removal becomes a single Storage
   * RPC instead of N round-trips. The Supabase Storage `remove([...])`
   * call is atomic per request: either all paths the API accepts are
   * processed, or none.
   */
  deletePhotos?: (paths: string[]) => Promise<void>
}

/**
 * Update a property and best-effort delete storage objects for any photos
 * that the new `media.photos` array no longer references.
 *
 * Order matters: persist the DB update first, then delete the orphaned
 * objects. The DB row is the source of truth for what is referenced — a
 * failed delete leaves an orphan (recovered eventually by the bucket
 * cleanup cron, TPD-6) but the user never sees a `<Image>` pointing at a
 * deleted file. This mirrors the avatar upload/remove ordering.
 *
 * Cleanup is skipped silently when:
 * - the caller did not pass `deletePhoto` (no storage client available), or
 * - the patch does not touch `media.photos` (e.g. updating only `title`),
 *
 * so existing callers that update non-media fields keep their previous
 * behaviour unchanged.
 */
export async function updatePropertyUseCase(
  ctx: SessionContext,
  id: string,
  data: Partial<Property>,
  options: UpdatePropertyOptions = {},
): Promise<Property> {
  const repo = new DrizzlePropertyRepository()
  const newPhotos = data.media?.photos
  const { deletePhotos } = options

  // Skip the snapshot read entirely when no cleanup is wired up or the patch
  // does not touch media.photos. Destructuring `deletePhotos` here also gives
  // us a locally-narrowed reference (TypeScript does not narrow through a
  // derived boolean variable), so no non-null assertion is needed below.
  if (newPhotos === undefined || deletePhotos === undefined) {
    return repo.update(ctx, id, data)
  }

  // Snapshot pre-update so we can diff. Both reads run under the same RLS
  // session, so an `agent` who lacks update permission gets the same
  // "Property not found or no permission" from `repo.update` regardless of
  // whether `findById` succeeds — the snapshot does not leak existence.
  const current = await repo.findById(ctx, id)
  const updated = await repo.update(ctx, id, data)

  if (!current) return updated

  const newPhotoSet = new Set(newPhotos)
  // Single batched RPC instead of N round-trips. Defense-in-depth path
  // prefix check stays — storage RLS already rejects deletes outside the
  // caller's `{orgId}/` prefix, but pre-filtering keeps logs clean and
  // avoids surfacing RLS denials as warnings for URLs the user pasted
  // from another bucket or a non-Supabase host. `extractStoragePath`
  // returns null for URLs that are not Supabase public URLs of this
  // bucket, so non-Supabase or wrong-bucket URLs drop out here.
  const orphanPaths = current.media.photos
    .filter((url) => !newPhotoSet.has(url))
    .map((url) => extractStoragePath("property-media", url))
    .filter((path): path is string => path !== null && path.startsWith(`${ctx.orgId}/`))

  if (orphanPaths.length === 0) return updated

  try {
    await deletePhotos(orphanPaths)
  } catch (error) {
    console.warn(
      `[property-media] orphan cleanup failed (paths=${orphanPaths.join(",")})`,
      error,
    )
  }

  return updated
}
