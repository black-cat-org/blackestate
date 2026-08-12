"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, MoreHorizontal, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InquiryStatusBadge } from "./inquiry-status-badge"
import { DiscardInquiryDialog } from "./discard-inquiry-dialog"
import { PromoteInquiryDialog } from "./promote-inquiry-dialog"
import { deleteInquiryAction } from "@/features/inquiries/presentation/actions"
import { describeInquiryDeleteError } from "@/features/inquiries/presentation/inquiry-error-messages"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

interface InquiryDetailHeaderProps {
  inquiry: Inquiry
}

export function InquiryDetailHeader({ inquiry }: InquiryDetailHeaderProps) {
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
        router.push("/dashboard/inquiries")
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeInquiryDeleteError(code))
      }
    })
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/inquiries">
            <ArrowLeft className="mr-1 size-4" />
            Volver
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            Consulta de {inquiry.contactName ?? "—"}
          </h1>
          <InquiryStatusBadge status={inquiry.status} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canPromote && (
          <Button size="sm" onClick={() => setPromoteOpen(true)}>
            <ArrowRight className="mr-2 size-4" />
            Promover a negocio
          </Button>
        )}
        {canDiscard && (
          <Button variant="outline" size="sm" onClick={() => setDiscardOpen(true)}>
            <XCircle className="mr-2 size-4" />
            Descartar
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Más acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="text-muted-foreground" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
        description="La consulta se moverá a la papelera. Se puede restaurar luego."
        onConfirm={handleDelete}
        confirming={isPending}
      />
    </div>
  )
}
