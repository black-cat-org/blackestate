import type { Property } from "@/features/properties/domain/property.entity"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import { Badge } from "@/components/ui/badge"
import { MapPinIcon } from "lucide-react"

interface LandingHeaderProps {
  property: Property
}

export function LandingHeader({ property }: LandingHeaderProps) {
  const { address } = property
  const location = [
    address.neighborhood,
    address.city,
    address.state,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {OPERATION_TYPE_LABELS[property.operationType]}
        </Badge>
        <Badge variant="outline">
          {PROPERTY_TYPE_LABELS[property.type]}
        </Badge>
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">{property.title}</h1>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MapPinIcon className="size-4 shrink-0" />
        <span className="text-sm">
          {address.street}
          {address.number ? ` ${address.number}` : ""}
          {location ? ` — ${location}` : ""}
        </span>
      </div>
    </header>
  )
}
