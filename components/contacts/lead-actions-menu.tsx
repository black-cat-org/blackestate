"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LEAD_STATUS_TRANSITIONS } from "@/lib/constants/lead"
import { updateLead, deleteLead } from "@/lib/data/leads"
import { toast } from "sonner"
import type { Lead } from "@/lib/types/lead"

export function LeadActionsMenu({ lead }: { lead: Lead }) {
  const router = useRouter()
  const transitions = LEAD_STATUS_TRANSITIONS[lead.status]
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleStatusChange = async (newStatus: Lead["status"]) => {
    try {
      await updateLead(lead.id, { status: newStatus })
      toast.success("Estado actualizado")
      router.refresh()
    } catch {
      toast.error("Error al cambiar estado")
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteLead(lead.id)
      setDeleteDialogOpen(false)
      toast.success("Lead eliminado")
      router.refresh()
    } catch {
      toast.error("Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/leads/${lead.id}`}>
              <Eye className="text-muted-foreground" />
              Ver detalle
            </Link>
          </DropdownMenuItem>
          {transitions.filter((t) => t.status !== "descartado").map((t) => (
            <DropdownMenuItem key={t.status} onClick={() => handleStatusChange(t.status)}>
              {t.label}
            </DropdownMenuItem>
          ))}
          {transitions.some((t) => t.status === "descartado") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleStatusChange("descartado")}
              >
                Descartar
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
            <Trash2 className="text-muted-foreground" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar lead</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar a {lead.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
