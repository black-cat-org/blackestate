"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AI_CONTENT_TYPE_LABELS } from "@/lib/constants/ai"
import type { AiContent, AiContentFilters } from "@/lib/types/ai-content"

interface AiContentsFiltersProps {
  filters: AiContentFilters
  onFiltersChange: (filters: AiContentFilters) => void
  contents: AiContent[]
}

export function AiContentsFilters({
  filters,
  onFiltersChange,
  contents,
}: AiContentsFiltersProps) {
  const properties = Array.from(
    new Map(contents.map((c) => [c.propertyId, c.propertyTitle])).entries()
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por texto o propiedad..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Select
          value={filters.type}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, type: value as AiContentFilters["type"] })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(AI_CONTENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.propertyId}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, propertyId: value as AiContentFilters["propertyId"] })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Propiedad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {properties.map(([id, title]) => (
              <SelectItem key={id} value={id}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
