import type { SupabaseClient } from "@supabase/supabase-js"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { deleteFile, extractStoragePath } from "@/lib/supabase/storage"

export async function deletePropertyMediaUseCase(
  ctx: SessionContext,
  client: SupabaseClient,
  photoUrl: string,
): Promise<void> {
  const path = extractStoragePath("property-media", photoUrl)
  if (!path) {
    throw new Error("Invalid property media URL")
  }

  const [pathOrgId] = path.split("/")
  if (pathOrgId !== ctx.orgId) {
    throw new Error("Forbidden")
  }

  await deleteFile(client, "property-media", path)
}
