import { PropertyCard } from "./property-card"
import { computeKitStatus } from "@/hooks/use-marketing-kit"
import type { Property } from "@/features/properties/domain/property.entity"
import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"

interface PropertyCardsGridProps {
  properties: Property[]
  contents?: AiContent[]
}

export function PropertyCardsGrid({ properties, contents = [] }: PropertyCardsGridProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-lg">No se encontraron propiedades</p>
        <p className="text-muted-foreground text-sm">Intenta ajustar los filtros de búsqueda</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => {
        const propertyContents = contents.filter((c) => c.propertyId === property.id)
        const kitStatus = computeKitStatus(propertyContents)
        return (
          <PropertyCard key={property.id} property={property} kitStatus={kitStatus} />
        )
      })}
    </div>
  )
}
