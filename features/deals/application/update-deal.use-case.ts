import type {
  Deal,
  UpdateDealDTO,
} from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Patch an existing Deal (excluding stage transitions and reorders —
 * those go through `moveDealStage` / `reorderDealsInStage` which run
 * atomically inside the repo).
 *
 * Throw token surfaced by repository: `deal_not_found` (id missing,
 * RLS-hidden, or soft-deleted).
 */
export async function updateDealUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  id: string,
  data: UpdateDealDTO,
): Promise<Deal> {
  return dealRepo.update(ctx, id, data)
}
