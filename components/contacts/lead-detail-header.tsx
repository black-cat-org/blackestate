"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LeadStatusBadge } from "@/components/contacts/lead-status-badge"
import { LeadSourceBadge } from "@/components/contacts/lead-source-badge"
import { LEAD_STATUS_TRANSITIONS } from "@/lib/constants/lead"
import { updateLead, deleteLead } from "@/lib/data/leads"
import { toast } from "sonner"
import type { Lead } from "@/lib/types/lead"

export function LeadDetailHeader({ lead }: { lead: Lead }) {
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
      toast.success("Lead eliminado")
      router.push("/dashboard/leads")
    } catch {
      toast.error("Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/leads">
          <ArrowLeft className="mr-2 size-4" />
          Volver al listado
        </Link>
      </Button>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {transitions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer">
                    <LeadStatusBadge status={lead.status} />
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
              <LeadStatusBadge status={lead.status} />
            )}
            <LeadSourceBadge source={lead.source} />
          </div>
        </div>
        <Button variant="outline" className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
          <Trash2 className="mr-2 size-4" />
          Eliminar
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar lead</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar a {lead.name}? Esta acción no se puede deshacer.
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
    </div>
  )
}
