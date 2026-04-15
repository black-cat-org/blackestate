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
import { LEAD_STATUS_LABELS } from "@/lib/constants/lead"
import { SOURCE_LABELS } from "@/lib/constants/sources"
import type { LeadFilters } from "@/features/leads/domain/lead.entity"

interface LeadFiltersBarProps {
  filters: LeadFilters
  onFiltersChange: (filters: LeadFilters) => void
}

export function LeadFiltersBar({ filters, onFiltersChange }: LeadFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as LeadFilters["status"] })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.source}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, source: value as LeadFilters["source"] })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
