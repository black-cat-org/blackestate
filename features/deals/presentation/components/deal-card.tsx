"use client"

import Link from "next/link"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { DEAL_SOURCE_LABELS } from "@/lib/constants/deal"
import { cn } from "@/lib/utils"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface DealCardProps {
  deal: Deal
}

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

/**
 * Sortable Kanban card. The whole card is the drag handle per the R28
 * design decision (no dedicated handle) — pointer activation lives on
 * R31's sensor with `activationConstraint: { distance: 8 }`, so quick
 * clicks pass through to the navigation `<Link>` and only sustained
 * pointer movement triggers a drag.
 *
 * ⚠️ HARD DEPENDENCY ON R31'S SENSOR `activationConstraint: { distance: 8 }`.
 * Without that constraint, every tap on a touch device is consumed by
 * the drag sensor on `pointerdown` before the `<Link>` click can fire,
 * making cards non-navigable on mobile. The card must NOT be mounted
 * outside a `<DndContext>` that supplies the constrained PointerSensor
 * (R31). Treating the card as standalone-renderable would silently
 * break navigation on mobile.
 *
 * When `isDragging` is true the card is rendered semi-transparent —
 * R31's `<DragOverlay>` clones the card for the floating preview, so
 * the original slot acts as a placeholder that keeps the column's
 * layout stable while the drag is in flight.
 *
 * Spreading `attributes` + `listeners` on the outer wrapper keeps the
 * inner `<Link>` independently focusable (two tab stops per card —
 * one for "drag this", one for "navigate to detail"); the navigation
 * intent is what most keyboard users want, so leaving the link
 * focusable is intentional rather than collapsing both affordances
 * onto a single element.
 */
export function DealCard({ deal }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    // Suppress the settle transition while dragging so the ghost
    // doesn't animate from the dragged position back to 0 at the same
    // time as the DragOverlay clone is moving — mirrors the
    // `media-step.tsx` precedent and avoids a visible snap twitch on
    // drag end.
    transition: isDragging ? undefined : transition,
  }

  const showMetaRow = Boolean(deal.source || deal.expectedCloseAt)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <Link
        href={`/dashboard/deals/${deal.id}`}
        className="bg-card hover:bg-accent/40 block rounded-md border p-3 shadow-sm transition-colors"
      >
        <div className="space-y-1.5">
          <p className="truncate text-sm font-medium">
            {deal.contactName ?? "Sin contacto"}
          </p>
          {deal.propertyTitle && (
            <p className="text-muted-foreground truncate text-xs">
              {deal.propertyTitle}
            </p>
          )}
          {showMetaRow && (
            <div className="flex items-center justify-between gap-2 pt-1">
              {deal.source ? (
                <Badge variant="secondary" className="text-[10px]">
                  {DEAL_SOURCE_LABELS[deal.source]}
                </Badge>
              ) : (
                <span />
              )}
              {deal.expectedCloseAt && (
                <span className="text-muted-foreground text-[10px]">
                  {dateFormatter.format(new Date(deal.expectedCloseAt))}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}
