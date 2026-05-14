import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Deals that reached a terminal stage (`won` or `lost`) and are not
 * soft-deleted. Powers the "Archivo" tab on the deals dashboard,
 * separate from the Kanban (which only shows active deals).
 *
 * Ordered by `closed_at DESC` per `IDealRepository.findAllClosed`
 * contract — most recently closed first. Cannot be expressed as a
 * filter on `getDealsUseCase` because that hits `findAllActive`
 * which explicitly excludes terminal stages, and `findByStage` lacks
 * the union (would need two roundtrips for won + lost).
 */
export async function getClosedDealsUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
): Promise<Deal[]> {
  return dealRepo.findAllClosed(ctx)
}
