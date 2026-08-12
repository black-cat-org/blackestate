import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * All non-deleted Deals belonging to a Contact, including closed ones —
 * powers the "Deals" section of the contact detail page. Ordered
 * `updated_at DESC` in the adapter.
 */
export async function getDealsByContactUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  contactId: string,
): Promise<Deal[]> {
  return dealRepo.findByContactId(ctx, contactId)
}
