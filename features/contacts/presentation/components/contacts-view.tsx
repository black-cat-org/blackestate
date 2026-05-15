"use client"

import { ContactFiltersBar } from "./contact-filters"
import { ContactDataTable } from "./contact-data-table"
import { useContactsFilter } from "@/hooks/use-contacts-filter"
import type { Contact } from "@/features/contacts/domain/contact.entity"

interface ContactsViewProps {
  contacts: Contact[]
}

/**
 * Client wrapper around the contacts list. Owns the filter state
 * (search + tag) and renders the filter bar + data table. The
 * server page passes the full contact list; filtering is
 * client-side because (a) the dataset stays small for an agency,
 * and (b) filter changes shouldn't round-trip to the server.
 */
export function ContactsView({ contacts }: ContactsViewProps) {
  const { filters, setFilters, availableTags, filteredContacts } =
    useContactsFilter(contacts)

  return (
    <div className="flex flex-col gap-4">
      <ContactFiltersBar
        filters={filters}
        availableTags={availableTags}
        onFiltersChange={setFilters}
      />
      <ContactDataTable contacts={filteredContacts} />
    </div>
  )
}
