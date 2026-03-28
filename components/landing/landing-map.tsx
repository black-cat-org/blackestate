"use client"

import type { PropertyAddress } from "@/lib/types/property"
import { PropertyMap } from "@/components/maps/property-map"
import { MapPinIcon } from "lucide-react"

interface LandingMapProps {
  address: PropertyAddress
  hideExactLocation: boolean
}

export function LandingMap({ address, hideExactLocation }: LandingMapProps) {
  const hasCoords = address.lat != null && address.lng != null

  if (!hasCoords) {
    return null
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Ubicación</h2>
      <div className="overflow-hidden rounded-lg border">
        <div className="aspect-[16/9]">
          <PropertyMap
            lat={address.lat!}
            lng={address.lng!}
            mode={hideExactLocation ? "approximate" : "exact"}
          />
        </div>

        {!hideExactLocation && (
          <div className="flex items-center gap-2 border-t bg-muted/50 px-4 py-3">
            <MapPinIcon className="size-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {address.street}
              {address.number ? ` ${address.number}` : ""}
              {", "}
              {[address.neighborhood, address.city, address.state]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
