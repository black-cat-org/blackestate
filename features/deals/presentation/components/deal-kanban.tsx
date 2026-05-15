"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { toast } from "sonner"
import { DealCard } from "./deal-card"
import { DealKanbanColumn } from "./deal-kanban-column"
import {
  moveDealStageAction,
  reorderDealsInStageAction,
} from "@/features/deals/presentation/actions"
import {
  describeDealMoveStageError,
  describeDealReorderError,
} from "@/features/deals/presentation/deal-error-messages"
import type { Deal, DealStage } from "@/features/deals/domain/deal.entity"

interface DealKanbanProps {
  /**
   * Pre-filtered active Deals (non-deleted AND non-terminal). The
   * parent is expected to fetch via `getDealsAction` /
   * `IDealRepository.findAllActive` which already excludes
   * `won` / `lost`. Terminal Deals live in the archive view (R33),
   * not in the Kanban.
   */
  deals: Deal[]
}

/**
 * Stages rendered as Kanban columns, in left-to-right funnel order.
 * Derived from `DealStage \ TERMINAL_DEAL_STAGES` but hardcoded here
 * to keep the order locked at the UI layer — the domain enum's
 * declaration order is the source of truth, but a separate constant
 * survives if the domain ever reorders for non-UI reasons.
 */
const ACTIVE_STAGES = [
  "visit_scheduled",
  "negotiation",
  "reserved",
] as const satisfies ReadonlyArray<DealStage>

const COLUMN_ID_PREFIX = "column-"

type DealsByStage = Record<DealStage, Deal[]>

function groupByStage(deals: Deal[]): DealsByStage {
  const grouped: DealsByStage = {
    visit_scheduled: [],
    negotiation: [],
    reserved: [],
    won: [],
    lost: [],
  }
  for (const d of deals) {
    if ((ACTIVE_STAGES as ReadonlyArray<DealStage>).includes(d.stage)) {
      grouped[d.stage].push(d)
    }
  }
  return grouped
}

function isActiveStage(
  value: string,
): value is (typeof ACTIVE_STAGES)[number] {
  return (ACTIVE_STAGES as ReadonlyArray<string>).includes(value)
}

/**
 * Resolve a dnd-kit `over.id` to the target stage + insertion index
 * inside that stage's list. Returns `null` when the id is neither a
 * known column sentinel nor a known active-stage Deal id (e.g. drop
 * was cancelled or fell on a non-target zone).
 */
function parseDropTarget(
  overId: string,
  grouped: DealsByStage,
): { stage: DealStage; insertIndex: number } | null {
  if (overId.startsWith(COLUMN_ID_PREFIX)) {
    const stage = overId.slice(COLUMN_ID_PREFIX.length)
    if (isActiveStage(stage)) {
      return { stage, insertIndex: grouped[stage].length }
    }
    return null
  }
  for (const stage of ACTIVE_STAGES) {
    const idx = grouped[stage].findIndex((d) => d.id === overId)
    if (idx >= 0) return { stage, insertIndex: idx }
  }
  return null
}

function findSourceStage(
  activeId: string,
  grouped: DealsByStage,
): DealStage | null {
  for (const stage of ACTIVE_STAGES) {
    if (grouped[stage].some((d) => d.id === activeId)) return stage
  }
  return null
}

/**
 * Top-level Kanban composer. Owns the `<DndContext>`, the optimistic
 * `dealsByStage` state, and the rollback path. Children (R29 columns,
 * R30 cards) are pure presentational and don't know about the action
 * layer.
 *
 * Optimistic flow:
 *   1. `onDragStart` records `activeId` for the `<DragOverlay>` clone.
 *   2. `onDragOver` tracks `overStage` so columns get an `isDragOver`
 *      signal that fires uniformly across empty and non-empty
 *      columns (the per-column `useDroppable.isOver` cannot, see
 *      R29 docstring).
 *   3. `onDragEnd` resolves the operation:
 *        - Same source/target stage → `reorderDealsInStageAction`
 *        - Cross-stage → `moveDealStageAction` with computed `toOrder`
 *      Local state is mutated synchronously (optimistic) and the
 *      action call lives inside `startTransition`. On throw, the
 *      pre-mutation snapshot is restored and the mapped error toast
 *      is shown. On success, `router.refresh()` reconciles with the
 *      server state to absorb anything a concurrent agent may have
 *      changed in the same org.
 *
 * `useEffect` resyncs the local state when `deals` prop changes (the
 * parent refetches after `router.refresh()` or after an out-of-band
 * mutation). Because the action awaits the server before
 * `router.refresh()` fires, the resync sees reconciled data — not a
 * stale snapshot that would clobber the optimistic update.
 *
 * No drag-blocking during `isPending`: reorder/move operations are
 * idempotent at the DB layer (`stage_order` is rewritten explicitly
 * by R20's adapter), so last-write-wins on rapid consecutive drags
 * is safe. The Kanban stays responsive instead of locking the agent
 * out for a server roundtrip.
 */
export function DealKanban({ deals }: DealKanbanProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [grouped, setGrouped] = useState<DealsByStage>(() =>
    groupByStage(deals),
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<DealStage | null>(null)

  /**
   * Server-confirmed grouped state. Updated ONLY from the `deals`
   * prop (i.e. when the parent refetches and re-renders), never from
   * optimistic mutations. Used as the rollback target so that
   * concurrent drags cannot leave the board in a corrupt state.
   *
   * Failure mode this protects against: two drags A and B in flight,
   * A applies optimistic state S1, B captures `grouped` (= S1) as its
   * "snapshot". If A throws, A's rollback uses A's closure snapshot
   * (S0) — correct. But if B then throws, naive rollback to B's
   * closure snapshot would restore S1 (A's optimistic) even though
   * A failed — board is silently corrupt. Rolling back to
   * `serverGroupedRef.current` instead restores the last
   * server-confirmed state, which is correct in all orderings.
   */
  const serverGroupedRef = useRef<DealsByStage>(groupByStage(deals))

  useEffect(() => {
    const confirmed = groupByStage(deals)
    serverGroupedRef.current = confirmed
    setGrouped(confirmed)
  }, [deals])

  const activeDeal = useMemo(() => {
    if (!activeId) return null
    for (const stage of ACTIVE_STAGES) {
      const d = grouped[stage].find((x) => x.id === activeId)
      if (d) return d
    }
    return null
  }, [activeId, grouped])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id
    if (!overId) {
      setOverStage(null)
      return
    }
    const target = parseDropTarget(String(overId), grouped)
    setOverStage(target ? target.stage : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverStage(null)
    if (!over) return

    const activeIdStr = String(active.id)
    const fromStage = findSourceStage(activeIdStr, grouped)
    const target = parseDropTarget(String(over.id), grouped)
    if (!fromStage || !target) return

    if (fromStage === target.stage) {
      const oldIndex = grouped[fromStage].findIndex(
        (d) => d.id === activeIdStr,
      )
      if (oldIndex < 0 || oldIndex === target.insertIndex) return

      const next: DealsByStage = {
        ...grouped,
        [fromStage]: arrayMove(
          grouped[fromStage],
          oldIndex,
          target.insertIndex,
        ),
      }
      setGrouped(next)

      startTransition(async () => {
        try {
          await reorderDealsInStageAction(
            fromStage,
            next[fromStage].map((d) => d.id),
          )
          router.refresh()
        } catch (error) {
          const code = error instanceof Error ? error.message : ""
          setGrouped(serverGroupedRef.current)
          toast.error(describeDealReorderError(code))
        }
      })
      return
    }

    const oldIndex = grouped[fromStage].findIndex(
      (d) => d.id === activeIdStr,
    )
    if (oldIndex < 0) return

    const movedDeal = grouped[fromStage][oldIndex]
    const nextFromList = [...grouped[fromStage]]
    nextFromList.splice(oldIndex, 1)
    const nextToList = [...grouped[target.stage]]
    nextToList.splice(target.insertIndex, 0, {
      ...movedDeal,
      stage: target.stage,
    })
    const next: DealsByStage = {
      ...grouped,
      [fromStage]: nextFromList,
      [target.stage]: nextToList,
    }
    setGrouped(next)

    startTransition(async () => {
      try {
        await moveDealStageAction(activeIdStr, {
          toStage: target.stage,
          toOrder: target.insertIndex,
        })
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        setGrouped(serverGroupedRef.current)
        toast.error(describeDealMoveStageError(code))
      }
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {ACTIVE_STAGES.map((stage) => (
          <DealKanbanColumn
            key={stage}
            stage={stage}
            dealIds={grouped[stage].map((d) => d.id)}
            isDragOver={overStage === stage}
          >
            {grouped[stage].map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </DealKanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
