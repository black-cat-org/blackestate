import { AMENITIES_OPTIONS } from "@/lib/constants/property"
import { Badge } from "@/components/ui/badge"

interface LandingAmenitiesProps {
  amenities: string[]
}

export function LandingAmenities({ amenities }: LandingAmenitiesProps) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Amenities</h2>
      <div className="flex flex-wrap gap-2">
        {amenities.map((amenity) => {
          const option = AMENITIES_OPTIONS.find((a) => a.value === amenity)
          return (
            <Badge key={amenity} variant="secondary" className="text-sm">
              {option?.label ?? amenity}
            </Badge>
          )
        })}
      </div>
    </section>
  )
}
