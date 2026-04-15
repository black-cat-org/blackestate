"use client"

import { MapPin, ShieldCheck, Eye } from "lucide-react"
import { PropertyMap } from "@/components/maps/property-map"
import type { PostalAddress } from "@/features/shared/domain/value-objects"

interface PropertyDetailMapProps {
  address: PostalAddress
  hideExactLocation: boolean
}

export function PropertyDetailMap({ address, hideExactLocation }: PropertyDetailMapProps) {
  if (!address.lat || !address.lng) {
    return (
      <div className="bg-muted flex aspect-video items-center justify-center rounded-lg">
        <div className="text-center text-sm text-muted-foreground">
          <MapPin className="mx-auto size-8" />
          <p className="mt-2">Coordenadas GPS no disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="aspect-video">
        <PropertyMap lat={address.lat} lng={address.lng} mode="exact" />
      </div>

      <div className="absolute right-2 top-2 z-10">
        {hideExactLocation ? (
          <div className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-300">
            <ShieldCheck className="size-3.5" />
            Ubicación aproximada para visitantes
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800 shadow-sm dark:border-blue-800 dark:bg-blue-950/90 dark:text-blue-300">
            <Eye className="size-3.5" />
            Ubicación exacta visible
          </div>
        )}
      </div>
    </div>
  )
}
