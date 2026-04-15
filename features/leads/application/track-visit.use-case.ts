import type { PropertyVisit } from "@/features/leads/domain/lead.entity"
import { DrizzleLeadRepository } from "@/features/leads/infrastructure/drizzle-lead.repository"

export async function trackVisitUseCase(
  propertyId: string,
  source: string | null,
): Promise<PropertyVisit> {
  const repo = new DrizzleLeadRepository()
  return repo.trackVisit(propertyId, source)
}

export async function getVisitsByPropertyUseCase(
  propertyId: string,
): Promise<PropertyVisit[]> {
  const repo = new DrizzleLeadRepository()
  return repo.getVisitsByProperty(propertyId)
}
