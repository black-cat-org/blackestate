"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { DealStageBadge } from "./deal-stage-badge"
import { DEAL_STAGE_DROP_INDICATOR_CLASSES } from "@/lib/constants/deal"
import { cn } from "@/lib/utils"
import type { DealStage } from "@/features/deals/domain/deal.entity"

interface DealKanbanColumnProps {
  stage: DealStage
  dealIds: string[]
  children: React.ReactNode
  /**
   * R31 sets this from the top-level `<DndContext>` using
   * `useDndMonitor` to track which column's stage the current drag is
   * over. Necessary because dnd-kit resolves `over.id` to the nearest
   * sortable item on non-empty columns — so the column-level
   * `useDroppable.isOver` never fires when cards fill the column,
   * which would leave the drop indicator silent on non-empty
   * columns. The column composes `isOver || isDragOver` to drive
   * the indicator uniformly across empty and non-empty columns.
   *
   * Empty columns still rely on the local `useDroppable` so the
   * column is reachable as a drop target even before R31 is wired.
   */
  isDragOver?: boolean
}

/**
 * Kanban column for a single Deal stage. Pure presentational + drop
 * target. Knows nothing about how cards render — receives them as
 * `children` from R31 `<DealKanban>`. Also receives `dealIds`
 * separately so `<SortableContext>` can manage sortable order without
 * the column needing to import the Deal entity shape. The count shown
 * in the header is derived from `dealIds.length` to guarantee header
 * and body stay in sync.
 *
 * Drop-target semantics: the body wrapper is a `useDroppable` so empty
 * columns are still drop zones. A column with zero sortable items
 * cannot rely on per-item droppability via `useSortable`, so the
 * container itself must register as a droppable target. R31's
 * `onDragEnd` resolves `over.id` against both deal ids (sortable
 * items) and `column-${stage}` ids (empty-column drops).
 *
 * The drop indicator color matches the column header badge
 * (DEAL_STAGE_BADGE_CLASSES) for visual continuity — see
 * `DEAL_STAGE_DROP_INDICATOR_CLASSES`.
 */
export function DealKanbanColumn({
  stage,
  dealIds,
  children,
  isDragOver = false,
}: DealKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage}` })
  const showDropIndicator = isOver || isDragOver
  const isEmpty = dealIds.length === 0

  return (
    <div className="flex w-80 shrink-0 flex-col">
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <DealStageBadge stage={stage} />
        <span className="text-muted-foreground text-xs font-medium tabular-nums">
          {dealIds.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          showDropIndicator
            ? cn("ring-2", DEAL_STAGE_DROP_INDICATOR_CLASSES[stage])
            : "border-transparent",
          isEmpty && !showDropIndicator && "border-border/60",
        )}
      >
        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>

        {isEmpty && (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
            {showDropIndicator ? "Suelta aquí" : "Sin negocios"}
          </div>
        )}
      </div>
    </div>
  )
}
