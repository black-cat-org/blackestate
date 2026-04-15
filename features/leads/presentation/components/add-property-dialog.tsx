"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { ImageIcon, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { formatPrice } from "@/lib/utils/format"
import type { Property } from "@/lib/types/property"

interface AddPropertyDialogProps {
  title?: string
  properties: Property[]
  queuedPropertyIds?: Set<string>
  sentPropertyIds?: Set<string>
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (property: Property) => void
}

export function AddPropertyDialog({
  title = "Agregar propiedad",
  properties,
  queuedPropertyIds = new Set(),
  sentPropertyIds = new Set(),
  open,
  onOpenChange,
  onAdd,
}: AddPropertyDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return properties
    const q = searchQuery.toLowerCase()
    return properties.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.address.neighborhood?.toLowerCase().includes(q) ||
        p.address.city.toLowerCase().includes(q) ||
        PROPERTY_TYPE_LABELS[p.type].toLowerCase().includes(q)
    )
  }, [properties, searchQuery])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, zona o tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="max-h-[45vh]">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron propiedades disponibles.
            </p>
          ) : (
            <div className="space-y-2 pr-3">
              {filtered.map((property) => {
                const inQueue = queuedPropertyIds.has(property.id)
                const wasSent = sentPropertyIds.has(property.id)
                const disabled = inQueue || wasSent

                return (
                  <div
                    key={property.id}
                    className={`flex gap-3 rounded-lg border p-2.5 transition-colors ${disabled ? "opacity-60" : "hover:bg-accent/50"}`}
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {property.media.photos.length > 0 ? (
                        <Image
                          src={property.media.photos[0]}
                          alt={property.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImageIcon className="size-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{property.title}</p>
                      <p className="text-xs font-semibold text-primary">{formatPrice(property.price)}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {PROPERTY_TYPE_LABELS[property.type]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {OPERATION_TYPE_LABELS[property.operationType]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      {wasSent ? (
                        <Badge variant="secondary" className="text-[10px]">Enviada</Badge>
                      ) : inQueue ? (
                        <Badge variant="secondary" className="text-[10px]">En cola</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() => onAdd(property)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
