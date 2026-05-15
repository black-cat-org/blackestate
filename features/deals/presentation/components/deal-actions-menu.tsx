"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { deleteDealAction } from "@/features/deals/presentation/actions"
import { describeDealDeleteError } from "@/features/deals/presentation/deal-error-messages"
import { DealEditDialog } from "./deal-edit-dialog"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface DealActionsMenuProps {
  deal: Deal
}

/**
 * Compact row-level actions menu for the Deal table view (R33).
 * Mirrors the inquiry/contact pattern: Ver / Editar / Eliminar.
 *
 * Stage transitions (Marcar ganada/perdida, Reabrir, Cambiar etapa)
 * intentionally live ONLY on the detail header (R27), not here. The
 * table is a read/scan surface — agents who need to act on funnel
 * progression open the detail page or use the Kanban drag&drop.
 * Keeping the row menu compact avoids overwhelming the table and
 * keeps the funnel action surface in one place.
 */
export function DealActionsMenu({ deal }: DealActionsMenuProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteDealAction(deal.id)
        toast.success("Negocio eliminado")
        setDeleteOpen(false)
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeDealDeleteError(code))
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={isPending}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/deals/${deal.id}`}>
              <Eye className="text-muted-foreground" />
              Ver detalle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="text-muted-foreground" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="text-muted-foreground" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DealEditDialog open={editOpen} onOpenChange={setEditOpen} deal={deal} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar negocio"
        description="El negocio se moverá a la papelera. Puedes restaurarlo luego."
        onConfirm={handleDelete}
        confirming={isPending}
      />
    </>
  )
}
