"use client"

import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LEAD_STATUS_TRANSITIONS } from "@/lib/constants/lead"
import { updateLead, deleteLead } from "@/lib/data/leads"
import { toast } from "sonner"
import type { Lead } from "@/lib/types/lead"

export function LeadActionsMenu({ lead }: { lead: Lead }) {
  const router = useRouter()
  const transitions = LEAD_STATUS_TRANSITIONS[lead.status]

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
    try {
      await deleteLead(lead.id)
      toast.success("Contacto eliminado")
      router.refresh()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/contacts/${lead.id}`}>
            <Eye className="text-muted-foreground" />
            Ver detalle
          </Link>
        </DropdownMenuItem>
        {transitions.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Cambiar estado</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {transitions.map((t) => (
                <DropdownMenuItem key={t.status} onClick={() => handleStatusChange(t.status)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="text-muted-foreground" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
