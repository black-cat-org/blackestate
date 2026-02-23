import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyStatusBadge } from "@/components/properties/property-status-badge"
import { OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants/property"
import type { Property } from "@/lib/types/property"

export function PropertyDetailHeader({ property }: { property: Property }) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/properties">
          <ArrowLeft className="mr-2 size-4" />
          Volver al listado
        </Link>
      </Button>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{property.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PropertyStatusBadge status={property.status} />
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
              {OPERATION_TYPE_LABELS[property.operationType]}
            </span>
            <span className="text-muted-foreground text-sm">
              {PROPERTY_TYPE_LABELS[property.type]}
            </span>
          </div>
        </div>
        <Button variant="outline" disabled>
          <Pencil className="mr-2 size-4" />
          Editar
        </Button>
      </div>
    </div>
  )
}
