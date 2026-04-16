import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"
import { uploadFiles } from "@/lib/supabase/storage"

export async function uploadPropertyMediaUseCase(
  ctx: SessionContext,
  propertyId: string,
  files: File[],
): Promise<string[]> {
  const repo = new DrizzlePropertyRepository()
  const property = await repo.findById(ctx, propertyId)
  if (!property) {
    throw new Error("Property not found or forbidden")
  }

  return uploadFiles("property-media", ctx.orgId, propertyId, files)
}
