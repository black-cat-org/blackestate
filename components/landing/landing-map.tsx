import type { PropertyAddress } from "@/lib/types/property"
import { Button } from "@/components/ui/button"
import { MapPinIcon, ExternalLinkIcon } from "lucide-react"

interface LandingMapProps {
  address: PropertyAddress
}

export function LandingMap({ address }: LandingMapProps) {
  const hasCoords = address.lat != null && address.lng != null
  const googleMapsUrl =
    address.googleMapsUrl ||
    (hasCoords
      ? `https://www.google.com/maps?q=${address.lat},${address.lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(
          `${address.street} ${address.number || ""}, ${address.city}, ${address.state}`
        )}`)

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Ubicación</h2>
      <div className="flex aspect-[16/9] items-center justify-center rounded-lg border bg-muted">
        <div className="text-center text-muted-foreground">
          <MapPinIcon className="mx-auto size-10" />
          <p className="mt-2 text-sm">
            {address.street}
            {address.number ? ` ${address.number}` : ""}
          </p>
          <p className="text-sm">
            {[address.neighborhood, address.city, address.state]
              .filter(Boolean)
              .join(", ")}
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-3.5" />
              Ver en Google Maps
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
