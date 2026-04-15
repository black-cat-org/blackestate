import type { Property } from "@/features/properties/domain/property.entity"
import { CONDITION_OPTIONS, ORIENTATION_OPTIONS } from "@/lib/constants/property"
import { formatSurface } from "@/lib/utils/format"
import {
  RulerIcon,
  HomeIcon,
  DoorOpenIcon,
  BedDoubleIcon,
  BathIcon,
  CarIcon,
  CalendarIcon,
  WrenchIcon,
  CompassIcon,
} from "lucide-react"

interface LandingCharacteristicsProps {
  property: Property
}

export function LandingCharacteristics({ property }: LandingCharacteristicsProps) {
  const conditionLabel = CONDITION_OPTIONS.find(
    (c) => c.value === property.condition
  )?.label
  const orientationLabel = ORIENTATION_OPTIONS.find(
    (o) => o.value === property.orientation
  )?.label

  const characteristics = [
    property.totalArea && {
      icon: RulerIcon,
      label: "Superficie total",
      value: formatSurface(property.totalArea),
    },
    property.coveredArea && {
      icon: HomeIcon,
      label: "Superficie cubierta",
      value: formatSurface(property.coveredArea),
    },
    property.rooms != null && {
      icon: DoorOpenIcon,
      label: "Habitaciones",
      value: property.rooms,
    },
    property.bedrooms != null && {
      icon: BedDoubleIcon,
      label: "Dormitorios",
      value: property.bedrooms,
    },
    property.bathrooms != null && {
      icon: BathIcon,
      label: "Baños",
      value: property.bathrooms,
    },
    property.garages != null && {
      icon: CarIcon,
      label: "Estacionamiento",
      value: property.garages,
    },
    property.age != null && {
      icon: CalendarIcon,
      label: "Antigüedad",
      value: property.age === 0 ? "A estrenar" : `${property.age} años`,
    },
    conditionLabel && {
      icon: WrenchIcon,
      label: "Estado",
      value: conditionLabel,
    },
    orientationLabel && {
      icon: CompassIcon,
      label: "Orientación",
      value: orientationLabel,
    },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }[]

  if (characteristics.length === 0) return null

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Características</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {characteristics.map((char, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <char.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{char.label}</p>
              <p className="text-sm font-medium">{char.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
