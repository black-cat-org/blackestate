"use client"

import { useState, useMemo } from "react"
import type { AiContent, AiContentFilters } from "@/lib/types/ai-content"

const DEFAULT_FILTERS: AiContentFilters = {
  search: "",
  type: "all",
  propertyId: "all",
}

export function useAiContentsFilter(contents: AiContent[]) {
  const [filters, setFilters] = useState<AiContentFilters>(DEFAULT_FILTERS)

  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      if (filters.type !== "all" && c.type !== filters.type) return false
      if (filters.propertyId !== "all" && c.propertyId !== filters.propertyId) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchText = c.text.toLowerCase().includes(q)
        const matchTitle = c.propertyTitle.toLowerCase().includes(q)
        if (!matchText && !matchTitle) return false
      }
      return true
    })
  }, [contents, filters])

  return { filters, setFilters, filteredContents }
}
