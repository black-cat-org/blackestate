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
import { restoreInquiryAction } from "@/features/inquiries/presentation/actions"
import { describeInquiryRestoreError } from "@/features/inquiries/presentation/inquiry-error-messages"
import { INQUIRY_SOURCE_LABELS } from "@/lib/constants/inquiry"
import { InquiryStatusBadge } from "./inquiry-status-badge"
import type { Inquiry } from "@/features/inquiries/domain/inquiry.entity"

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

interface InquiryTrashListProps {
  inquiries: Inquiry[]
}

export function InquiryTrashList({ inquiries }: InquiryTrashListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = (id: string) => {
    if (isPending) return
    setRestoringId(id)
    startTransition(async () => {
      try {
        await restoreInquiryAction(id)
        toast.success("Consulta restaurada")
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        toast.error(describeInquiryRestoreError(code))
      } finally {
        setRestoringId(null)
      }
    })
  }

  if (inquiries.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No hay consultas en la papelera.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contacto</TableHead>
            <TableHead>Propiedad</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Eliminada</TableHead>
            <TableHead>Eliminada por</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inquiries.map((inquiry) => (
            <TableRow key={inquiry.id}>
              <TableCell className="font-medium">
                {inquiry.contactName ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {inquiry.propertyTitle ?? "(propiedad eliminada)"}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {inquiry.source ? INQUIRY_SOURCE_LABELS[inquiry.source] : "—"}
              </TableCell>
              <TableCell>
                <InquiryStatusBadge status={inquiry.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {inquiry.deletedAt
                  ? dateFormatter.format(new Date(inquiry.deletedAt))
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {inquiry.deletedBy ? (
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm">
                      {inquiry.deletedBy.userName ?? "—"}
                    </span>
                    {inquiry.deletedBy.userEmail && (
                      <span className="text-xs">{inquiry.deletedBy.userEmail}</span>
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
                  disabled={isPending && restoringId === inquiry.id}
                  onClick={() => handleRestore(inquiry.id)}
                >
                  <ArchiveRestore className="mr-2 size-4" />
                  {isPending && restoringId === inquiry.id
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
