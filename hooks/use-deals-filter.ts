"use client"

import { useMemo, useState } from "react"
import type { Deal, DealFilters } from "@/features/deals/domain/deal.entity"

interface UseDealsFilterOptions {
  /**
   * Seeds the filter state with a `propertyId` drill-down. Callers
   * that render the deal list embedded inside a property scope (a
   * property detail page) pass it so the board opens already narrowed
   * to that property. The stand-alone `/dashboard/deals` page omits
   * it and the predicate stays dormant.
   */
  initialPropertyId?: string
}

/**
 * Frontend filter hook for the deal board (Kanban + Table). Mirror of
 * `use-inquiries-filter` / `use-contacts-filter` — owns local filter
 * state and returns the filtered array memoized against `deals` +
 * filters.
 *
 * `search` matches contact name OR property title (case-insensitive):
 * deal cards surface contact + property prominently, so agents pivot
 * across both vocabularies. `stage` filters the active funnel (won /
 * lost never enter the active board to begin with). `source` filters
 * by acquisition channel. `propertyId` is an optional drill-down
 * predicate seeded by `initialPropertyId`.
 */
export function useDealsFilter(
  deals: Deal[],
  { initialPropertyId }: UseDealsFilterOptions = {},
) {
  const [filters, setFilters] = useState<DealFilters>(() => ({
    search: "",
    stage: "all",
    source: "all",
    propertyId: initialPropertyId,
  }))

  const filteredDeals = useMemo(() => {
    const query = filters.search.trim().toLowerCase()

    return deals.filter((deal) => {
      if (filters.stage !== "all" && deal.stage !== filters.stage) {
        return false
      }
      if (filters.source !== "all" && deal.source !== filters.source) {
        return false
      }
      if (filters.propertyId && deal.propertyId !== filters.propertyId) {
        return false
      }
      if (query) {
        const name = deal.contactName?.toLowerCase() ?? ""
        const title = deal.propertyTitle?.toLowerCase() ?? ""
        if (!name.includes(query) && !title.includes(query)) {
          return false
        }
      }
      return true
    })
  }, [deals, filters])

  return { filters, setFilters, filteredDeals }
}
