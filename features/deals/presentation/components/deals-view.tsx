"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DealFiltersBar } from "./deal-filters"
import { DealBoardContent } from "./deal-board"
import { useDealsFilter } from "@/hooks/use-deals-filter"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface DealsViewProps {
  deals: Deal[]
  /**
   * Seeds the filter state with a property drill-down (e.g. when the
   * board is embedded in a property detail page). Standalone callers
   * (the `/dashboard/deals` page) omit it and the predicate stays
   * dormant.
   */
  initialPropertyId?: string
}

const VIEW_PARAM = "view"

/**
 * Client wrapper around the deal board. Owns the filter state and
 * routes the filtered list to `DealBoard` (which handles the Kanban ↔
 * Table toggle internally). The stage filter is hidden while the
 * Kanban surface is active because the columns ARE the stage axis —
 * a stage filter there would either be redundant (Kanban → highlight
 * one column) or empty most columns (Kanban → only show one stage).
 *
 * The view param is read from the same URL key that `DealBoard`
 * writes (`?view=table`) so the two stay coupled without lifting
 * state. `useSearchParams()` is a Suspense boundary requirement in
 * Next.js 16; the inner shell is wrapped in `<Suspense>` here so
 * callers don't need to know.
 */
function DealsViewInner({ deals, initialPropertyId }: DealsViewProps) {
  const searchParams = useSearchParams()
  const isTableView = searchParams.get(VIEW_PARAM) === "table"
  const { filters, setFilters, filteredDeals } = useDealsFilter(deals, {
    initialPropertyId,
  })

  return (
    <div className="flex flex-col gap-4">
      <DealFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        showStageFilter={isTableView}
      />
      <DealBoardContent deals={filteredDeals} />
    </div>
  )
}

export function DealsView(props: DealsViewProps) {
  return (
    <Suspense fallback={null}>
      <DealsViewInner {...props} />
    </Suspense>
  )
}
