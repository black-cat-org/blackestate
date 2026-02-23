"use client"

import { useState, useMemo } from "react"
import type { Lead, LeadFilters } from "@/lib/types/lead"

const DEFAULT_FILTERS: LeadFilters = {
  search: "",
  status: "all",
  source: "all",
}

export function useLeadsFilter(leads: Lead[]) {
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS)

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filters.status !== "all" && l.status !== filters.status) return false
      if (filters.source !== "all" && l.source !== filters.source) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchName = l.name.toLowerCase().includes(q)
        const matchEmail = l.email.toLowerCase().includes(q)
        const matchPhone = l.phone.toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchPhone) return false
      }
      return true
    })
  }, [leads, filters])

  return { filters, setFilters, filteredLeads }
}
