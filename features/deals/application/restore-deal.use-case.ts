import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Restore a soft-deleted Deal. Throw tokens from the repository:
 * `deal_not_found`, `deal_already_restored`, `deal_no_permission`.
 * Action layer (R25) maps to localised Spanish messages.
 */
export async function restoreDealUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  id: string,
): Promise<Deal> {
  return dealRepo.restore(ctx, id)
}
