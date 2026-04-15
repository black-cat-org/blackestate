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
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
} from "@/lib/constants/property"
import type { PropertyFilters } from "@/features/properties/domain/property.entity"

interface PropertyFiltersBarProps {
  filters: PropertyFilters
  onFiltersChange: (filters: PropertyFilters) => void
}

export function PropertyFiltersBar({ filters, onFiltersChange }: PropertyFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por título o dirección..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Select
          value={filters.type}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, type: value as PropertyFilters["type"] })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.operationType}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, operationType: value as PropertyFilters["operationType"] })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Operación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as PropertyFilters["status"] })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
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
