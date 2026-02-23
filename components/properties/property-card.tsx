import Link from "next/link"
import { Bath, BedDouble, Car, Maximize2, MapPin } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { PropertyStatusBadge } from "./property-status-badge"
import { PropertyActionsMenu } from "./property-actions-menu"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { formatPrice, formatSurface } from "@/lib/utils/format"
import type { Property } from "@/lib/types/property"

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Card className="overflow-hidden">
      <Link href={`/dashboard/properties/${property.id}`}>
        <div className="bg-muted relative aspect-video">
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            {property.media.photos.length > 0 ? "📷" : "Sin fotos"}
          </div>
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
        <div className="flex items-center gap-2">
          <PropertyStatusBadge status={property.status} />
          <span className="text-muted-foreground text-xs">
            {PROPERTY_TYPE_LABELS[property.type]}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
