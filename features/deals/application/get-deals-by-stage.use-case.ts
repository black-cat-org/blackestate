import type { Deal, DealStage } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * All non-deleted Deals currently in a single funnel stage. Used by
 * the Kanban for single-column lazy fetch / virtualised rendering.
 * Ordered `stageOrder ASC`. Soft-deleted excluded.
 *
 * Unlike `getDealsUseCase`, this method does NOT auto-exclude terminal
 * stages — calling with `'won'` returns closed-won Deals.
 */
export async function getDealsByStageUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  stage: DealStage,
): Promise<Deal[]> {
  return dealRepo.findByStage(ctx, stage)
}
