"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bot, ImageIcon, Sparkles, X, Plus, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
import { toast } from "sonner"
import type { Property } from "@/features/properties/domain/property.entity"
import type { Lead } from "@/features/leads/domain/lead.entity"

interface LeadSuggestedPropertiesProps {
  lead: Lead
  suggestedProperties: Property[]
  allProperties: Property[]
}

export function LeadSuggestedProperties({
  lead,
  suggestedProperties: initialSuggested,
  allProperties,
}: LeadSuggestedPropertiesProps) {
  const [suggested, setSuggested] = useState<Property[]>(initialSuggested)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const suggestedIds = new Set(suggested.map((p) => p.id))

  const availableToAdd = useMemo(() => {
    const available = allProperties.filter(
      (p) => p.id !== lead.propertyId && !suggestedIds.has(p.id)
    )
    if (!searchQuery.trim()) return available
    const q = searchQuery.toLowerCase()
    return available.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.address.neighborhood?.toLowerCase().includes(q) ||
        p.address.city.toLowerCase().includes(q) ||
        PROPERTY_TYPE_LABELS[p.type].toLowerCase().includes(q)
    )
  }, [allProperties, lead.propertyId, suggestedIds, searchQuery])

  function handleRemove(propertyId: string) {
    setSuggested((prev) => prev.filter((p) => p.id !== propertyId))
    toast.success("Propiedad removida de sugerencias")
  }

  function handleAdd(property: Property) {
    setSuggested((prev) => [...prev, property])
    toast.success("Propiedad agregada a sugerencias")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="size-4" />
            Propiedades sugeridas
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Bot className="size-3" />
            Seleccionadas según las preferencias del lead
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>

      {suggested.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Sparkles className="mx-auto size-8 text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground text-sm">
            No hay propiedades sugeridas para {lead.name}.
          </p>
          {!lead.propertyTypeSought && !lead.budget && !lead.zoneOfInterest && (
            <p className="text-muted-foreground mt-1 text-xs">
              Completá el tipo buscado, presupuesto o zona de interés para obtener sugerencias automáticas.
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Agregar manualmente
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {suggested.map((property) => (
            <Card key={property.id} className="relative gap-0 overflow-hidden py-0 transition-colors hover:bg-accent/50">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1.5 z-10 size-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(property.id)}
              >
                <X className="size-3.5" />
              </Button>
              <Link
                href={`/dashboard/properties/${property.id}`}
                className="block"
              >
                <CardContent className="flex gap-3 p-3!">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {property.media.photos.length > 0 ? (
                      <Image
                        src={property.media.photos[0]}
                        alt={property.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <ImageIcon className="size-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">{property.title}</p>
                    <p className="text-sm font-bold text-primary">
                      {formatPrice(property.price)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {PROPERTY_TYPE_LABELS[property.type]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {OPERATION_TYPE_LABELS[property.operationType]}
                      </Badge>
                      {property.address.neighborhood && (
                        <span className="text-[10px] text-muted-foreground">
                          {property.address.neighborhood}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Add property dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar propiedad sugerida</DialogTitle>
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
          <ScrollArea className="max-h-[350px]">
            {availableToAdd.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No se encontraron propiedades disponibles.
              </p>
            ) : (
              <div className="space-y-2 pr-3">
                {availableToAdd.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                      {property.media.photos.length > 0 ? (
                        <Image
                          src={property.media.photos[0]}
                          alt={property.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImageIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{property.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-primary">
                          {formatPrice(property.price)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {PROPERTY_TYPE_LABELS[property.type]}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleAdd(property)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
