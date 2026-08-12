"use client"

import { useMemo, useState } from "react"
import type { Inquiry, InquiryFilters } from "@/features/inquiries/domain/inquiry.entity"

interface UseInquiriesFilterOptions {
  /**
   * Seeds the filter state with a `propertyId` drill-down. Callers that
   * render the inquiry list embedded inside a property scope (e.g. a
   * property detail page) pass it here so the list opens already
   * narrowed to that property. Stand-alone callers (the
   * `/dashboard/inquiries` page) omit it and the predicate stays
   * dormant.
   */
  initialPropertyId?: string
}

/**
 * Frontend filter hook for the inquiry list view. Mirror of
 * `use-leads-filter` / `use-contacts-filter` — owns local filter state
 * and returns the filtered array memoized against `inquiries` + filters.
 *
 * `search` matches the contact name OR the message body (case-insensitive)
 * because agents typically know the person before they remember the
 * inquiry text. `propertyId` is an optional drill-down predicate seeded
 * by `initialPropertyId` and exposed via `setFilters` for callers that
 * want to surface a property selector later.
 */
export function useInquiriesFilter(
  inquiries: Inquiry[],
  { initialPropertyId }: UseInquiriesFilterOptions = {},
) {
  const [filters, setFilters] = useState<InquiryFilters>(() => ({
    search: "",
    status: "all",
    source: "all",
    propertyId: initialPropertyId,
  }))

  const filteredInquiries = useMemo(() => {
    const query = filters.search.trim().toLowerCase()

    return inquiries.filter((inquiry) => {
      if (filters.status !== "all" && inquiry.status !== filters.status) {
        return false
      }
      if (filters.source !== "all" && inquiry.source !== filters.source) {
        return false
      }
      if (filters.propertyId && inquiry.propertyId !== filters.propertyId) {
        return false
      }
      if (query) {
        const name = inquiry.contactName?.toLowerCase() ?? ""
        const message = inquiry.message?.toLowerCase() ?? ""
        if (!name.includes(query) && !message.includes(query)) {
          return false
        }
      }
      return true
    })
  }, [inquiries, filters])

  return { filters, setFilters, filteredInquiries }
}
