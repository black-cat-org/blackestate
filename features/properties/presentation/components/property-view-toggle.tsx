"use client"

import { LayoutGrid, List } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PropertyViewMode } from "@/features/properties/domain/property.entity"

interface PropertyViewToggleProps {
  viewMode: PropertyViewMode
  onViewModeChange: (mode: PropertyViewMode) => void
}

export function PropertyViewToggle({ viewMode, onViewModeChange }: PropertyViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(value) => {
        if (value) onViewModeChange(value as PropertyViewMode)
      }}
    >
      <ToggleGroupItem value="cards" aria-label="Vista cards">
        <LayoutGrid className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Vista tabla">
        <List className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
