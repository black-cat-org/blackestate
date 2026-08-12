"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Eye, MoreHorizontal, Trash2, XCircle } from "lucide-react"
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
import { deleteInquiryAction } from "@/features/inquiries/presentation/actions"
import { describeInquiryDeleteError } from "@/features/inquiries/presentation/inquiry-error-messages"
import { DiscardInquiryDialog } from "./discard-inquiry-dialog"
import { PromoteInquiryDialog } from "./promote-inquiry-dialog"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

interface InquiryActionsMenuProps {
  inquiry: Inquiry
}

export function InquiryActionsMenu({ inquiry }: InquiryActionsMenuProps) {
  const router = useRouter()
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canPromote = inquiry.status === "open"
  const canDiscard = inquiry.status === "open"

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteInquiryAction(inquiry.id)
        toast.success("Consulta eliminada")
        setDeleteOpen(false)
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeInquiryDeleteError(code))
      }
    })
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
            <Link href={`/dashboard/inquiries/${inquiry.id}`}>
              <Eye className="text-muted-foreground" />
              Ver detalle
            </Link>
          </DropdownMenuItem>
          {canPromote && (
            <DropdownMenuItem onClick={() => setPromoteOpen(true)}>
              <ArrowRight className="text-muted-foreground" />
              Promover a negocio
            </DropdownMenuItem>
          )}
          {canDiscard && (
            <DropdownMenuItem onClick={() => setDiscardOpen(true)}>
              <XCircle className="text-muted-foreground" />
              Descartar
            </DropdownMenuItem>
          )}
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

      {canPromote && (
        <PromoteInquiryDialog
          open={promoteOpen}
          onOpenChange={setPromoteOpen}
          inquiry={inquiry}
        />
      )}

      {canDiscard && (
        <DiscardInquiryDialog
          open={discardOpen}
          onOpenChange={setDiscardOpen}
          inquiry={inquiry}
        />
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar consulta"
        description="La consulta se moverá a la papelera. Puedes restaurarla luego."
        onConfirm={handleDelete}
        confirming={isPending}
      />
    </>
  )
}
