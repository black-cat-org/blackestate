"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PropertyStatusBadge } from "@/components/properties/property-status-badge"
import { OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS, STATUS_TRANSITIONS } from "@/lib/constants/property"
import { updateProperty } from "@/lib/data/properties"
import { toast } from "sonner"
import type { Property } from "@/lib/types/property"

export function PropertyDetailHeader({ property }: { property: Property }) {
  const router = useRouter()
  const transitions = STATUS_TRANSITIONS[property.status]

  const handleStatusChange = async (newStatus: Property["status"]) => {
    try {
      await updateProperty(property.id, { status: newStatus })
      toast.success("Estado actualizado")
      router.refresh()
    } catch {
      toast.error("Error al cambiar estado")
    }
  }

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
            {transitions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer">
                    <PropertyStatusBadge status={property.status} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {transitions.map((t) => (
                    <DropdownMenuItem key={t.status} onClick={() => handleStatusChange(t.status)}>
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <PropertyStatusBadge status={property.status} />
            )}
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
              {OPERATION_TYPE_LABELS[property.operationType]}
            </span>
            <span className="text-muted-foreground text-sm">
              {PROPERTY_TYPE_LABELS[property.type]}
            </span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/properties/${property.id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Editar
          </Link>
        </Button>
      </div>
    </div>
  )
}
