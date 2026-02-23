import Image from "next/image"
import Link from "next/link"
import { Bath, BedDouble, Car, ImageIcon, Maximize2, MapPin, Sparkles } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PropertyStatusBadge } from "./property-status-badge"
import { PropertyActionsMenu } from "./property-actions-menu"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { MARKETING_KIT_TOTAL } from "@/lib/constants/ai"
import { formatPrice, formatSurface } from "@/lib/utils/format"
import type { Property } from "@/lib/types/property"
import type { MarketingKitStatus } from "@/lib/types/ai-content"

interface PropertyCardProps {
  property: Property
  kitStatus?: MarketingKitStatus
}

export function PropertyCard({ property, kitStatus }: PropertyCardProps) {
  const completedCount = kitStatus?.completedCount ?? 0
  const pct = kitStatus?.percentage ?? 0

  return (
    <Card className="overflow-hidden pt-0">
      <Link href={`/dashboard/properties/${property.id}`}>
        <div className="bg-muted relative aspect-video overflow-hidden">
          {property.media.photos.length > 0 ? (
            <Image
              src={property.media.photos[0]}
              alt={property.title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="size-8" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              {OPERATION_TYPE_LABELS[property.operationType]}
            </span>
          </div>
        </div>
      </Link>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{formatPrice(property.price)}</p>
            <Link
              href={`/dashboard/properties/${property.id}`}
              className="hover:underline"
            >
              <h3 className="truncate text-sm font-medium">{property.title}</h3>
            </Link>
          </div>
          <PropertyActionsMenu property={property} />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="size-3" />
          <span className="truncate">
            {property.address.street}
            {property.address.neighborhood ? `, ${property.address.neighborhood}` : ""}
            , {property.address.city}
          </span>
        </div>
        <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
          {property.totalArea && (
            <span className="flex items-center gap-1">
              <Maximize2 className="size-3" />
              {formatSurface(property.totalArea)}
            </span>
          )}
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="size-3" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="size-3" />
              {property.bathrooms}
            </span>
          )}
          {property.garages != null && property.garages > 0 && (
            <span className="flex items-center gap-1">
              <Car className="size-3" />
              {property.garages}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <PropertyStatusBadge status={property.status} />
            <span className="text-muted-foreground text-xs">
              {PROPERTY_TYPE_LABELS[property.type]}
            </span>
          </div>
          <Link href={`/dashboard/properties/${property.id}/marketing`}>
            {completedCount === 0 ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Sparkles className="size-3" />
                Generar contenido
              </Button>
            ) : completedCount >= MARKETING_KIT_TOTAL ? (
              <Badge className="bg-green-100 text-green-800">Listo para publicar</Badge>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <div className="bg-muted h-1.5 w-12 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {completedCount}/{MARKETING_KIT_TOTAL}
              </span>
            )}
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
