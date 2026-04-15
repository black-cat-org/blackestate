"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Pencil, Copy, Trash2, Share2 } from "lucide-react"
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
import { STATUS_TRANSITIONS } from "@/lib/constants/property"
import { updatePropertyAction, duplicatePropertyAction, deletePropertyAction } from "@/features/properties/presentation/actions"
import { toast } from "sonner"
import { ShareLinksDialog } from "./share-links-dialog"
import type { Property } from "@/features/properties/domain/property.entity"

export function PropertyActionsMenu({ property }: { property: Property }) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = useState(false)
  const transitions = STATUS_TRANSITIONS[property.status]

  const handleStatusChange = async (newStatus: Property["status"]) => {
    try {
      await updatePropertyAction(property.id, { status: newStatus })
      toast.success("Estado actualizado")
      router.refresh()
    } catch {
      toast.error("Error al cambiar estado")
    }
  }

  const handleDuplicate = async () => {
    try {
      await duplicatePropertyAction(property.id)
      toast.success("Propiedad duplicada")
      router.refresh()
    } catch {
      toast.error("Error al duplicar")
    }
  }

  const handleDelete = async () => {
    try {
      await deletePropertyAction(property.id)
      toast.success("Propiedad eliminada")
      router.refresh()
    } catch {
      toast.error("Error al eliminar")
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
          <Link href={`/dashboard/properties/${property.id}`}>
            <Eye className="text-muted-foreground" />
            Ver detalle
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/properties/${property.id}/edit`}>
            <Pencil className="text-muted-foreground" />
            Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="text-muted-foreground" />
          Duplicar
        </DropdownMenuItem>
        {property.status === "active" && (
          <DropdownMenuItem onClick={() => setShareOpen(true)}>
            <Share2 className="text-muted-foreground" />
            Compartir
          </DropdownMenuItem>
        )}
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
    <ShareLinksDialog
      property={property}
      open={shareOpen}
      onOpenChange={setShareOpen}
    />
    </>
  )
}
