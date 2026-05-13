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
import { restoreLeadAction } from "@/features/leads/presentation/actions"
import { LEAD_SOURCE_LABELS } from "@/lib/constants/lead"
import type { Lead } from "@/features/leads/domain/lead.entity"

interface LeadTrashListProps {
  leads: Lead[]
}

export function LeadTrashList({ leads }: LeadTrashListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = (id: string) => {
    if (isPending) return
    setRestoringId(id)
    startTransition(async () => {
      try {
        await restoreLeadAction(id)
        toast.success("Lead restaurado")
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message =
          code === "LEAD_ALREADY_RESTORED"
            ? "El lead ya estaba restaurado"
            : code === "LEAD_NOT_FOUND"
              ? "El lead no existe"
              : code === "LEAD_NO_PERMISSION"
                ? "No tienes permiso para restaurar este lead"
                : "No se pudo restaurar el lead"
        toast.error(message)
      } finally {
        setRestoringId(null)
      }
    })
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No hay leads en la papelera.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Propiedad</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Eliminado</TableHead>
            <TableHead>Eliminado por</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex flex-col text-xs">
                  {lead.phone && <span>{lead.phone}</span>}
                  {lead.email && <span>{lead.email}</span>}
                  {!lead.phone && !lead.email && <span>—</span>}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.propertyTitle ?? "(propiedad eliminada)"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.source ? LEAD_SOURCE_LABELS[lead.source] : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.deletedAt
                  ? new Intl.DateTimeFormat("es-BO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(lead.deletedAt))
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.deletedBy ? (
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm">
                      {lead.deletedBy.userName ?? "—"}
                    </span>
                    {lead.deletedBy.userEmail && (
                      <span className="text-xs">
                        {lead.deletedBy.userEmail}
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
                  onClick={() => handleRestore(lead.id)}
                >
                  <ArchiveRestore className="mr-2 size-4" />
                  {isPending && restoringId === lead.id ? "Restaurando…" : "Restaurar"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
