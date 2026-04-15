import { Bath, BedDouble, Car, DoorOpen, Maximize2, MapPin, Calendar, Compass } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPrice, formatSurface } from "@/lib/utils/format"
import {
  CONDITION_OPTIONS,
  ORIENTATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  AMENITIES_OPTIONS,
  CURRENCY_SYMBOLS,
} from "@/lib/constants/property"
import type { Property } from "@/lib/types/property"

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  )
}

export function PropertyDetailInfo({ property }: { property: Property }) {
  return (
    <div className="space-y-6">
      <InfoSection title="Precio">
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold">{formatPrice(property.price)}</p>
          {property.negotiable && (
            <Badge variant="secondary">Negociable</Badge>
          )}
        </div>
        {property.expenses && (
          <p className="text-muted-foreground text-sm">
            Expensas: {CURRENCY_SYMBOLS[property.expenses.currency]}{" "}
            {property.expenses.amount.toLocaleString("es-AR")}
          </p>
        )}
      </InfoSection>

      <Separator />

      <InfoSection title="Ubicación">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 text-muted-foreground shrink-0" />
          <div>
            <p>
              {property.address.street}
              {property.address.floor ? `, Piso ${property.address.floor}` : ""}
              {property.address.apartment ? ` ${property.address.apartment}` : ""}
            </p>
            <p className="text-muted-foreground">
              {property.address.neighborhood ? `${property.address.neighborhood}, ` : ""}
              {property.address.city}, {property.address.state}
            </p>
            <p className="text-muted-foreground">{property.address.country}</p>
          </div>
        </div>
      </InfoSection>

      <Separator />

      <InfoSection title="Características">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          {property.totalArea && (
            <div className="flex items-center gap-2">
              <Maximize2 className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Sup. total</p>
                <p className="font-medium">{formatSurface(property.totalArea)}</p>
              </div>
            </div>
          )}
          {property.coveredArea && (
            <div className="flex items-center gap-2">
              <Maximize2 className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Sup. construida</p>
                <p className="font-medium">{formatSurface(property.coveredArea)}</p>
              </div>
            </div>
          )}
          {property.rooms != null && (
            <div className="flex items-center gap-2">
              <DoorOpen className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Habitaciones</p>
                <p className="font-medium">{property.rooms}</p>
              </div>
            </div>
          )}
          {property.bedrooms != null && (
            <div className="flex items-center gap-2">
              <BedDouble className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Dormitorios</p>
                <p className="font-medium">{property.bedrooms}</p>
              </div>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="flex items-center gap-2">
              <Bath className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Baños</p>
                <p className="font-medium">{property.bathrooms}</p>
              </div>
            </div>
          )}
          {property.garages != null && (
            <div className="flex items-center gap-2">
              <Car className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Estacionamiento</p>
                <p className="font-medium">{property.garages}</p>
              </div>
            </div>
          )}
          {property.age != null && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Antigüedad</p>
                <p className="font-medium">{property.age} años</p>
              </div>
            </div>
          )}
          {property.condition && (
            <div className="flex items-center gap-2">
              <div>
                <p className="text-muted-foreground">Condición</p>
                <p className="font-medium">
                  {CONDITION_OPTIONS.find((o) => o.value === property.condition)?.label}
                </p>
              </div>
            </div>
          )}
          {property.orientation && (
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Orientación</p>
                <p className="font-medium">
                  {ORIENTATION_OPTIONS.find((o) => o.value === property.orientation)?.label}
                </p>
              </div>
            </div>
          )}
        </div>
      </InfoSection>

      {property.amenities.length > 0 && (
        <>
          <Separator />
          <InfoSection title="Amenities">
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="bg-muted rounded-full px-3 py-1 text-sm"
                >
                  {EQUIPMENT_OPTIONS.find((o) => o.value === amenity)?.label
                    || AMENITIES_OPTIONS.find((o) => o.value === amenity)?.label
                    || amenity}
                </span>
              ))}
            </div>
          </InfoSection>
        </>
      )}

      <Separator />

      <InfoSection title="Descripción">
        {property.shortDescription && (
          <p className="text-sm font-medium text-muted-foreground italic mb-2">{property.shortDescription}</p>
        )}
        <p className="text-sm leading-relaxed">{property.description}</p>
      </InfoSection>
    </div>
  )
}
