"use client"

import { useState, useMemo } from "react"
import type { Property, PropertyFilters, PropertyViewMode } from "@/lib/types/property"

const DEFAULT_FILTERS: PropertyFilters = {
  search: "",
  type: "all",
  operationType: "all",
  status: "all",
}

export function usePropertiesFilter(properties: Property[]) {
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS)
  const [viewMode, setViewMode] = useState<PropertyViewMode>("cards")

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filters.type !== "all" && p.type !== filters.type) return false
      if (filters.operationType !== "all" && p.operationType !== filters.operationType) return false
      if (filters.status !== "all" && p.status !== filters.status) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchTitle = p.title.toLowerCase().includes(q)
        const matchAddress = `${p.address.street} ${p.address.number} ${p.address.city} ${p.address.neighborhood || ""}`
          .toLowerCase()
          .includes(q)
        if (!matchTitle && !matchAddress) return false
      }
      return true
    })
  }, [properties, filters])

  return { filters, setFilters, viewMode, setViewMode, filteredProperties }
}
