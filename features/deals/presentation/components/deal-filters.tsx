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
import { DEAL_SOURCE_LABELS, DEAL_STAGE_LABELS } from "@/lib/constants/deal"
import { ACTIVE_DEAL_STAGES } from "@/features/deals/domain/deal.entity"
import type { DealFilters } from "@/features/deals/domain/deal.entity"

interface DealFiltersBarProps {
  filters: DealFilters
  onFiltersChange: (filters: DealFilters) => void
  /**
   * When the surface is the Kanban board the stage select is hidden:
   * Kanban columns ARE the stage axis, so a stage filter would either
   * be redundant or empty most columns. The Table view shows it.
   */
  showStageFilter: boolean
}

export function DealFiltersBar({
  filters,
  onFiltersChange,
  showStageFilter,
}: DealFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por contacto o propiedad…"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        {showStageFilter && (
          <Select
            value={filters.stage}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                stage: value as DealFilters["stage"],
              })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las etapas</SelectItem>
              {ACTIVE_DEAL_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {DEAL_STAGE_LABELS[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.source}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              source: value as DealFilters["source"],
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            {Object.entries(DEAL_SOURCE_LABELS).map(([value, label]) => (
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
