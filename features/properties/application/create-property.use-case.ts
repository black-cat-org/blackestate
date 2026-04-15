import type { Property, PropertyFormData } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"

export async function createPropertyUseCase(
  ctx: SessionContext,
  data: PropertyFormData,
): Promise<Property> {
  const repo = new DrizzlePropertyRepository()
  return repo.create(ctx, data)
}
