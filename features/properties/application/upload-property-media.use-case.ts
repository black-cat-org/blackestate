import type { SupabaseClient } from "@supabase/supabase-js"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"
import { uploadFiles } from "@/lib/supabase/storage"

export async function uploadPropertyMediaUseCase(
  ctx: SessionContext,
  client: SupabaseClient,
  propertyId: string,
  files: File[],
): Promise<string[]> {
  const repo = new DrizzlePropertyRepository()
  const property = await repo.findById(ctx, propertyId)
  if (!property) {
    throw new Error("Property not found or forbidden")
  }

  if (ctx.role === "agent" && property.createdByUserId !== ctx.userId) {
    throw new Error("Forbidden: agents can only upload media to their own properties")
  }

  return uploadFiles(client, "property-media", ctx.orgId, propertyId, files)
}
