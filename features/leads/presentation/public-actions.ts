"use server"

import { trackVisitUseCase } from "@/features/leads/application/track-visit.use-case"
import type { PropertyVisit } from "@/features/leads/domain/lead.entity"

// ---------------------------------------------------------------------------
// Public actions (no auth required) — execute via the `anon` Postgres role
// inside the repository, subject to the policies in
// drizzle/sql/017b_anon_public_policies.sql.
// ---------------------------------------------------------------------------

export async function trackVisitAction(
  propertyId: string,
  source: string | null,
): Promise<PropertyVisit> {
  return trackVisitUseCase(propertyId, source)
}
