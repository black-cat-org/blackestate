"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ContactEditDialog } from "./contact-edit-dialog"
import { ContactChannelBadge } from "./contact-channel-badge"
import { deleteContactAction } from "@/features/contacts/presentation/actions"
import { describeContactDeleteError } from "@/features/contacts/presentation/contact-error-messages"
import type { Contact } from "@/features/contacts/domain/contact.entity"

interface ContactDetailHeaderProps {
  contact: Contact
}

export function ContactDetailHeader({ contact }: ContactDetailHeaderProps) {
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
        router.push("/dashboard/contacts")
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeContactDeleteError(code))
      }
    })
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/contacts">
            <ArrowLeft className="mr-1 size-4" />
            Volver
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{contact.name}</h1>
          {contact.preferredChannel && (
            <ContactChannelBadge channel={contact.preferredChannel} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 size-4" />
          Editar
        </Button>
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

      <ContactEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar contacto"
        description={`¿Seguro que quieres eliminar a ${contact.name}? Se puede restaurar desde la papelera.`}
        onConfirm={handleDelete}
        confirming={isPending}
      />
    </div>
  )
}
