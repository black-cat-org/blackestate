import type { DealStage } from "@/features/deals/domain/deal.entity"
import type { IDealRepository } from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Rewrite `stage_order` for every active Deal in a Kanban column to
 * match the provided `orderedIds` array. Used after a within-column
 * drag-and-drop. Pure delegate — the atomicity (FOR UPDATE column
 * lock + set validation + per-row update) lives inside
 * `IDealRepository.reorderInStage()`.
 *
 * Throw tokens:
 *   - `reorder_ids_mismatch`   — payload count / set / unknown id mismatch
 *   - `terminal_stage_reorder` — caller passed `won` / `lost` (no drag
 *                                handle on the archive view; signals a
 *                                UI bug rather than a payload mismatch)
 */
export async function reorderDealsInStageUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  stage: DealStage,
  orderedIds: string[],
): Promise<void> {
  return dealRepo.reorderInStage(ctx, stage, orderedIds)
}
