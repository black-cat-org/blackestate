import type { Property } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"

export async function getPropertyByIdUseCase(
  ctx: SessionContext,
  id: string,
): Promise<Property | undefined> {
  const repo = new DrizzlePropertyRepository()
  return repo.findById(ctx, id)
}
