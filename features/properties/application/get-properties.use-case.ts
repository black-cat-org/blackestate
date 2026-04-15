import type { Property } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"

export async function getPropertiesUseCase(
  ctx: SessionContext,
): Promise<Property[]> {
  const repo = new DrizzlePropertyRepository()
  return repo.findAll(ctx)
}
