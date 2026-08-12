import type { Deal } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Active Kanban list — non-deleted Deals whose `stage` is not terminal
 * (`won`/`lost`). Ordered by `stage ASC, stageOrder ASC` in the
 * adapter so the Kanban renders columns left-to-right with cards in
 * their drag-and-drop order.
 *
 * Sibling use cases handle the non-active views:
 *   - `getClosedDealsUseCase` — terminal stages (`won`/`lost`),
 *     ordered by `closed_at DESC` (archive)
 *   - `getDeletedDealsUseCase` — soft-deleted, ordered by
 *     `deleted_at DESC` (trash)
 */
export async function getDealsUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
): Promise<Deal[]> {
  return dealRepo.findAllActive(ctx)
}
