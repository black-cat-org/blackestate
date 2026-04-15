import type { Property } from "@/features/properties/domain/property.entity"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"

export async function getPublicPropertyUseCase(
  id: string,
): Promise<Property | undefined> {
  const repo = new DrizzlePropertyRepository()
  return repo.findPublicById(id)
}
