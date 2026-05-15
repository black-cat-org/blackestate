import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  DEAL_STAGE_BADGE_CLASSES,
  DEAL_STAGE_LABELS,
} from "@/lib/constants/deal"
import type { DealStage } from "@/features/deals/domain/deal.entity"

interface DealStageBadgeProps {
  stage: DealStage
  className?: string
}

/**
 * Read-only badge rendering a Deal's current funnel stage. Consumed
 * by the detail header, the Kanban card (Fase 7 R30 / R31), and
 * future analytics surfaces.
 *
 * Shipped early during R27 (originally planned as the standalone R32
 * ticket in Fase 7) because the detail header needs it now and a
 * single shared component avoids divergent color tokens later. R32
 * tracks this as already-delivered.
 */
export function DealStageBadge({ stage, className }: DealStageBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(DEAL_STAGE_BADGE_CLASSES[stage], className)}
    >
      {DEAL_STAGE_LABELS[stage]}
    </Badge>
  )
}
