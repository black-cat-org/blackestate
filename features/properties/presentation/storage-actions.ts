"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { uploadPropertyMediaUseCase } from "@/features/properties/application/upload-property-media.use-case"
import { deletePropertyMediaUseCase } from "@/features/properties/application/delete-property-media.use-case"
import { uploadFiles } from "@/lib/supabase/storage"

export async function uploadPropertyMediaAction(
  propertyId: string,
  formData: FormData,
): Promise<string[]> {
  const ctx = await getSessionContext()

  const files = formData.getAll("files") as File[]
  if (files.length === 0) return []

  return uploadPropertyMediaUseCase(ctx, propertyId, files)
}

export async function deletePropertyMediaAction(photoUrl: string): Promise<void> {
  const ctx = await getSessionContext()
  return deletePropertyMediaUseCase(ctx, photoUrl)
}

export async function uploadAvatarAction(formData: FormData): Promise<string> {
  const ctx = await getSessionContext()

  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  const urls = await uploadFiles("avatars", ctx.orgId, ctx.userId, [file])
  return urls[0]
}
