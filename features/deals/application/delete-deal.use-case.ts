import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Soft-delete a Deal. Writes `deleted_at = now()` and snapshots the
 * deleter's identity into the audit columns. Throw token: `deal_not_found`.
 */
export async function deleteDealUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  id: string,
): Promise<void> {
  return dealRepo.softDelete(ctx, id)
}
