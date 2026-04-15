import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"

export async function deletePropertyUseCase(
  ctx: SessionContext,
  id: string,
): Promise<void> {
  const repo = new DrizzlePropertyRepository()
  return repo.softDelete(ctx, id)
}
