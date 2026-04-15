import type { Property } from "@/features/properties/domain/property.entity"

interface LandingDescriptionProps {
  property: Property
}

export function LandingDescription({ property }: LandingDescriptionProps) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Descripción</h2>
      {property.shortDescription && (
        <p className="mb-3 font-medium text-foreground">
          {property.shortDescription}
        </p>
      )}
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {property.description}
      </p>
    </section>
  )
}
