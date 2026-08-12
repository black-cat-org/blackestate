import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Fetch a single non-deleted Deal. Returns `undefined` when absent
 * or hidden by RLS. Use cases / components decide their own 404 path.
 */
export async function getDealByIdUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  id: string,
): Promise<Deal | undefined> {
  return dealRepo.findById(ctx, id)
}
