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
import { deleteContactAction } from "@/features/contacts/presentation/actions"
import { describeContactDeleteError } from "@/features/contacts/presentation/contact-error-messages"
import { ContactEditDialog } from "./contact-edit-dialog"
import type { Contact } from "@/features/contacts/domain/contact.entity"

interface ContactActionsMenuProps {
  contact: Contact
}

export function ContactActionsMenu({ contact }: ContactActionsMenuProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteContactAction(contact.id)
        toast.success("Contacto eliminado")
        setDeleteOpen(false)
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeContactDeleteError(code))
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
            <Link href={`/dashboard/contacts/${contact.id}`}>
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

      <ContactEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar contacto"
        description={`¿Seguro que quieres eliminar a ${contact.name}? Esta acción se puede deshacer desde la papelera.`}
        onConfirm={handleDelete}
        confirming={isPending}
      />
    </>
  )
}
