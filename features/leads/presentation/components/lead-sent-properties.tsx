"use client"

import Image from "next/image"
import Link from "next/link"
import { Send, ImageIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SENT_PROPERTY_STATUS_LABELS, SENT_PROPERTY_STATUS_COLORS } from "@/lib/constants/bot"
import type { SentProperty } from "@/features/bot/domain/bot.entity"
import type { Property } from "@/features/properties/domain/property.entity"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { formatPrice } from "@/lib/utils/format"

interface LeadSentPropertiesProps {
  sentProperties: SentProperty[]
  properties: Property[]
}

export function LeadSentProperties({ sentProperties, properties }: LeadSentPropertiesProps) {
  if (sentProperties.length === 0) {
    return null
  }

  const propertyMap = new Map(properties.map((p) => [p.id, p]))

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold flex items-center gap-2">
          <Send className="size-4" />
          Propiedades enviadas
        </h3>
        <p className="text-xs text-muted-foreground">
          Propiedades que el bot envió a este lead
        </p>
      </div>

      <div className="space-y-3">
        {sentProperties.map((sp) => {
          const property = propertyMap.get(sp.propertyId)
          if (!property) return null

          return (
            <Card key={sp.id} className="relative gap-0 overflow-hidden py-0 transition-colors hover:bg-accent/50">
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
                      <Badge className={`text-[10px] px-1.5 py-0 border-0 ${SENT_PROPERTY_STATUS_COLORS[sp.status]}`}>
                        {SENT_PROPERTY_STATUS_LABELS[sp.status]}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
