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
import type { ContactFilters } from "@/features/contacts/domain/contact.entity"

interface ContactFiltersBarProps {
  filters: ContactFilters
  /** Tags available for filtering (computed by the page from the contact list). */
  availableTags: string[]
  onFiltersChange: (filters: ContactFilters) => void
}

export function ContactFiltersBar({
  filters,
  availableTags,
  onFiltersChange,
}: ContactFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por nombre, teléfono o correo…"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select
        value={filters.tag}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, tag: value as ContactFilters["tag"] })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Etiqueta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las etiquetas</SelectItem>
          {availableTags.map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
