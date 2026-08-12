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
import { restoreContactAction } from "@/features/contacts/presentation/actions"
import { describeContactRestoreError } from "@/features/contacts/presentation/contact-error-messages"
import type { Contact } from "@/features/contacts/domain/contact.entity"

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

interface ContactTrashListProps {
  contacts: Contact[]
}

export function ContactTrashList({ contacts }: ContactTrashListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = (id: string) => {
    if (isPending) return
    setRestoringId(id)
    startTransition(async () => {
      try {
        await restoreContactAction(id)
        toast.success("Contacto restaurado")
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeContactRestoreError(code))
      } finally {
        setRestoringId(null)
      }
    })
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No hay contactos en la papelera.</p>
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
            <TableHead>Eliminado</TableHead>
            <TableHead>Eliminado por</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">{contact.name}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex flex-col text-xs">
                  {contact.phone && <span>{contact.phone}</span>}
                  {contact.email && <span>{contact.email}</span>}
                  {!contact.phone && !contact.email && <span>—</span>}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {contact.deletedAt
                  ? dateFormatter.format(new Date(contact.deletedAt))
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {contact.deletedBy ? (
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm">
                      {contact.deletedBy.userName ?? "—"}
                    </span>
                    {contact.deletedBy.userEmail && (
                      <span className="text-xs">{contact.deletedBy.userEmail}</span>
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
                  disabled={isPending && restoringId === contact.id}
                  onClick={() => handleRestore(contact.id)}
                >
                  <ArchiveRestore className="mr-2 size-4" />
                  {isPending && restoringId === contact.id
                    ? "Restaurando…"
                    : "Restaurar"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
