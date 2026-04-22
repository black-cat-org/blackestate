"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { uploadPropertyMediaUseCase } from "@/features/properties/application/upload-property-media.use-case"
import { deletePropertyMediaUseCase } from "@/features/properties/application/delete-property-media.use-case"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import {
  deleteFile,
  extractStoragePath,
  uploadFile,
} from "@/lib/supabase/storage"

export async function uploadPropertyMediaAction(
  propertyId: string,
  formData: FormData,
): Promise<string[]> {
  const ctx = await getSessionContext()
  const client = await getSupabaseServerClient()

  const files = formData.getAll("files").filter((v): v is File => v instanceof File)
  if (files.length === 0) return []

  return uploadPropertyMediaUseCase(ctx, client, propertyId, files)
}

export async function deletePropertyMediaAction(photoUrl: string): Promise<void> {
  const ctx = await getSessionContext()
  const client = await getSupabaseServerClient()
  return deletePropertyMediaUseCase(ctx, client, photoUrl)
}

/**
 * Upload a new avatar and best-effort delete the previous one.
 *
 * The previous URL is passed in via FormData (`previousAvatarUrl`). If the
 * delete fails (network issue, file already gone, etc.) we log and move on —
 * the new avatar already succeeded and we don't want to roll it back.
 */
export async function uploadAvatarAction(formData: FormData): Promise<string> {
  const ctx = await getSessionContext()
  const client = await getSupabaseServerClient()

  const file = formData.get("file")
  if (!(file instanceof File)) {
    throw new Error("No file provided")
  }

  const newUrl = await uploadFile(client, "avatars", ctx.orgId, ctx.userId, file)

  const previousAvatarUrl = formData.get("previousAvatarUrl")
  if (typeof previousAvatarUrl === "string" && previousAvatarUrl.length > 0) {
    const previousPath = extractStoragePath("avatars", previousAvatarUrl)
    if (previousPath?.startsWith(`${ctx.orgId}/${ctx.userId}/`)) {
      try {
        await deleteFile(client, "avatars", previousPath)
      } catch (error) {
        console.warn(
          `[avatar] previous avatar delete failed (path=${previousPath})`,
          error,
        )
      }
    }
  }

  return newUrl
}
