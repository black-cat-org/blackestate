import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Soft-deleted Deals (trash view). Powers the dedicated trash UI on
 * the deals dashboard from which an agent can restore Deals that were
 * deleted in error.
 *
 * Ordered by `deleted_at DESC` per `IDealRepository.findAllDeleted`
 * contract. Cannot be expressed as a filter on `getDealsUseCase`
 * because the default list filters out soft-deleted rows entirely.
 */
export async function getDeletedDealsUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
): Promise<Deal[]> {
  return dealRepo.findAllDeleted(ctx)
}
