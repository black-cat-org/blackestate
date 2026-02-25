import Image from "next/image"
import Link from "next/link"
import { Bot, ImageIcon, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { formatPrice } from "@/lib/utils/format"
import type { Property } from "@/lib/types/property"
import type { Lead } from "@/lib/types/lead"

interface LeadSuggestedPropertiesProps {
  lead: Lead
  suggestedProperties: Property[]
}

export function LeadSuggestedProperties({ lead, suggestedProperties }: LeadSuggestedPropertiesProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="size-4" />
          Propiedades sugeridas
        </h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Bot className="size-3" />
          Seleccionadas automáticamente según las preferencias del lead
        </p>
      </div>

      {suggestedProperties.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            No se encontraron propiedades que coincidan con las preferencias de {lead.name}.
          </p>
          {!lead.propertyTypeSought && !lead.budget && !lead.zoneOfInterest && (
            <p className="text-muted-foreground mt-1 text-xs">
              Completá el tipo buscado, presupuesto o zona de interés para obtener sugerencias.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestedProperties.map((property) => (
            <Link
              key={property.id}
              href={`/dashboard/properties/${property.id}`}
              className="block"
            >
              <Card className="overflow-hidden transition-colors hover:bg-accent/50">
                <CardContent className="flex gap-3 p-3">
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
