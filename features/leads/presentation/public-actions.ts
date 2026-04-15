"use server"

import {
  trackVisitUseCase,
  getVisitsByPropertyUseCase,
} from "@/features/leads/application/track-visit.use-case"
import type { PropertyVisit } from "@/features/leads/domain/lead.entity"

// ---------------------------------------------------------------------------
// Public actions (no auth required)
// ---------------------------------------------------------------------------

export async function trackVisitAction(
  propertyId: string,
  source: string | null,
): Promise<PropertyVisit> {
  return trackVisitUseCase(propertyId, source)
}

export async function getVisitsByPropertyAction(
  propertyId: string,
): Promise<PropertyVisit[]> {
  return getVisitsByPropertyUseCase(propertyId)
}
