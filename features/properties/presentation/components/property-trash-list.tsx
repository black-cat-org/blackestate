"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArchiveRestore } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { restorePropertyAction } from "@/features/properties/presentation/actions"
import { formatPrice } from "@/lib/utils/format"
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from "@/lib/constants/property"
import type { Property } from "@/features/properties/domain/property.entity"

interface PropertyTrashListProps {
  properties: Property[]
}

export function PropertyTrashList({ properties }: PropertyTrashListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = (id: string) => {
    if (isPending) return
    setRestoringId(id)
    startTransition(async () => {
      try {
        await restorePropertyAction(id)
        toast.success("Propiedad restaurada")
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message =
          code === "PROPERTY_ALREADY_RESTORED"
            ? "La propiedad ya estaba restaurada"
            : code === "PROPERTY_NOT_FOUND"
              ? "La propiedad no existe"
              : code === "PROPERTY_NO_PERMISSION"
                ? "No tienes permiso para restaurar esta propiedad"
                : "No se pudo restaurar la propiedad"
        toast.error(message)
      } finally {
        setRestoringId(null)
      }
    })
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground">La papelera está vacía.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Operación</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Eliminada</TableHead>
            <TableHead>Eliminada por</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => (
            <TableRow key={property.id}>
              <TableCell className="font-medium">{property.title}</TableCell>
              <TableCell>{PROPERTY_TYPE_LABELS[property.type]}</TableCell>
              <TableCell>{OPERATION_TYPE_LABELS[property.operationType]}</TableCell>
              <TableCell>{formatPrice(property.price)}</TableCell>
              <TableCell className="text-muted-foreground">
                {property.deletedAt
                  ? new Intl.DateTimeFormat("es-BO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(property.deletedAt))
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {property.deletedBy ? (
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm">
                      {property.deletedBy.userName ?? "—"}
                    </span>
                    {property.deletedBy.userEmail && (
                      <span className="text-xs">
                        {property.deletedBy.userEmail}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="italic">Sistema</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRestore(property.id)}
                >
                  <ArchiveRestore className="mr-2 size-4" />
                  {isPending && restoringId === property.id ? "Restaurando…" : "Restaurar"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
