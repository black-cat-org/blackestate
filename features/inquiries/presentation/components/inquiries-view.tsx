"use client"

import { InquiryFiltersBar } from "./inquiry-filters"
import { InquiryDataTable } from "./inquiry-data-table"
import { useInquiriesFilter } from "@/hooks/use-inquiries-filter"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

interface InquiriesViewProps {
  inquiries: Inquiry[]
  /**
   * Optional drill-down predicate. When set (e.g. from a property
   * detail page that embeds the inquiry list), the hook seeds its
   * filter state with `propertyId` so the table only renders inquiries
   * for that property. Stand-alone callers (the `/dashboard/inquiries`
   * page) leave it undefined and the predicate stays dormant.
   */
  initialPropertyId?: string
}

/**
 * Client wrapper around the inquiries list. Owns the filter state
 * (search + status + source + optional propertyId drill-down) and
 * renders the filter bar + data table. The server page passes the
 * full inquiry list; filtering is client-side because the dataset
 * stays small per org and changes shouldn't round-trip to the server.
 * Mirror of `ContactsView`.
 */
export function InquiriesView({
  inquiries,
  initialPropertyId,
}: InquiriesViewProps) {
  const { filters, setFilters, filteredInquiries } = useInquiriesFilter(
    inquiries,
    { initialPropertyId },
  )

  return (
    <div className="flex flex-col gap-4">
      <InquiryFiltersBar filters={filters} onFiltersChange={setFilters} />
      <InquiryDataTable inquiries={filteredInquiries} />
    </div>
  )
}
