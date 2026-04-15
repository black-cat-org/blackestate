import type { Property } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"

export async function updatePropertyUseCase(
  ctx: SessionContext,
  id: string,
  data: Partial<Property>,
): Promise<Property> {
  const repo = new DrizzlePropertyRepository()
  return repo.update(ctx, id, data)
}
