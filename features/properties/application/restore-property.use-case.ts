import type { Property } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"

export async function restorePropertyUseCase(
  ctx: SessionContext,
  id: string,
): Promise<Property> {
  const repo = new DrizzlePropertyRepository()
  return repo.restore(ctx, id)
}
