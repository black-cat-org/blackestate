import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Active Kanban list — non-deleted Deals whose `stage` is not terminal
 * (`won`/`lost`). Ordered by `stage ASC, stageOrder ASC` in the
 * adapter so the Kanban renders columns left-to-right with cards in
 * their drag-and-drop order.
 *
 * For the archive view (closed-won/closed-lost), a future
 * `getClosedDealsUseCase` can be added when the archive UI lands.
 * Not part of R22 per the sub-plan §4.3 enumeration.
 */
export async function getDealsUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
): Promise<Deal[]> {
  return dealRepo.findAllActive(ctx)
}
