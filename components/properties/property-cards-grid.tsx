import { PropertyCard } from "./property-card"
import type { Property } from "@/lib/types/property"

export function PropertyCardsGrid({ properties }: { properties: Property[] }) {
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
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  )
}
