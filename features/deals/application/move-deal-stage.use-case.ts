import type { Deal } from "@/features/deals/domain/deal.entity"
import type {
  IDealRepository,
  MoveDealStageInput,
} from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Move a Deal between funnel stages (or reposition within a stage when
 * `input.toStage === currentStage`). Pure delegate — the atomicity of
 * source + destination stage_order recompaction lives inside
 * `IDealRepository.moveStage()`:
 *   - FOR UPDATE lock on the deal row.
 *   - Shift neighbours in both columns inside a single transaction.
 *   - Set `closed_at = now()` when moving to terminal stage.
 *   - Clear `closed_at` + `lost_reason` when reopening a terminal Deal.
 *
 * Throw token: `deal_not_found`.
 */
export async function moveDealStageUseCase(
  ctx: SessionContext,
  dealRepo: IDealRepository,
  id: string,
  input: MoveDealStageInput,
): Promise<Deal> {
  return dealRepo.moveStage(ctx, id, input)
}
