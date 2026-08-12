"use client"

import { useState, useMemo } from "react"
import type { Contact, ContactFilters } from "@/features/contacts/domain/contact.entity"

const DEFAULT_FILTERS: ContactFilters = {
  search: "",
  tag: "all",
}

/**
 * Client-side filter hook for the contacts list. Mirror of
 * `use-leads-filter` (the legacy hook that R43 will retire).
 *
 * Filters operate over the entity shape: `search` matches name /
 * email / phone (case-insensitive substring); `tag` matches any of
 * the contact's tags. Computation is memoized on `(contacts,
 * filters)` so re-renders without dependency changes are free.
 */
export function useContactsFilter(contacts: Contact[]) {
  const [filters, setFilters] = useState<ContactFilters>(DEFAULT_FILTERS)

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    for (const contact of contacts) {
      for (const tag of contact.tags) set.add(tag)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [contacts])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (filters.tag !== "all" && !c.tags.includes(filters.tag)) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchName = c.name.toLowerCase().includes(q)
        const matchEmail = c.email?.toLowerCase().includes(q) ?? false
        const matchPhone = c.phone?.toLowerCase().includes(q) ?? false
        if (!matchName && !matchEmail && !matchPhone) return false
      }
      return true
    })
  }, [contacts, filters])

  return { filters, setFilters, availableTags, filteredContacts }
}
