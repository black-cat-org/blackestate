import { MapPin } from "lucide-react"
import type { PropertyAddress } from "@/lib/types/property"

export function PropertyDetailMap({ address }: { address: PropertyAddress }) {
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
    <div className="space-y-2">
      <div className="bg-muted flex aspect-video items-center justify-center rounded-lg">
        <div className="text-center text-sm text-muted-foreground">
          <MapPin className="mx-auto size-8" />
          <p className="mt-2">Mapa (integración pendiente)</p>
          <p className="mt-1 font-mono text-xs">
            {address.lat}, {address.lng}
          </p>
        </div>
      </div>
    </div>
  )
}
