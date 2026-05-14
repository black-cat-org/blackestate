import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * All non-deleted Deals on a Property, including closed ones — powers
 * the "Who is interested?" view on the property detail page. Ordered
 * `updated_at DESC` in the adapter.
 */
export async function getDealsByPropertyUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  propertyId: string,
): Promise<Deal[]> {
  return dealRepo.findByPropertyId(ctx, propertyId)
}
