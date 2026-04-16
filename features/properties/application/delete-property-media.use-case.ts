import type { SessionContext } from "@/features/shared/domain/session-context"
import { deleteFile } from "@/lib/supabase/storage"

export async function deletePropertyMediaUseCase(
  ctx: SessionContext,
  photoUrl: string,
): Promise<void> {
  const url = new URL(photoUrl)
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/property-media\/(.+)/)
  if (!pathMatch) {
    throw new Error("Invalid property media URL")
  }

  const storagePath = pathMatch[1]
  const [pathOrgId] = storagePath.split("/")
  if (pathOrgId !== ctx.orgId) {
    throw new Error("Forbidden")
  }

  await deleteFile("property-media", storagePath)
}
