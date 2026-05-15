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
import { restoreAppointmentAction } from "@/features/appointments/presentation/actions"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"

interface AppointmentTrashListProps {
  appointments: Appointment[]
}

export function AppointmentTrashList({ appointments }: AppointmentTrashListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = (id: string) => {
    if (isPending || restoringId !== null) return
    setRestoringId(id)
    startTransition(async () => {
      try {
        await restoreAppointmentAction(id)
        toast.success("Cita restaurada")
        router.refresh()
      } catch (error) {
        const code = error instanceof Error ? error.message : ""
        const message =
          code === "APPOINTMENT_ALREADY_RESTORED"
            ? "La cita ya estaba restaurada"
            : code === "APPOINTMENT_NOT_FOUND"
              ? "La cita no existe"
              : code === "APPOINTMENT_NO_PERMISSION"
                ? "No tienes permiso para restaurar esta cita"
                : "No se pudo restaurar la cita"
        toast.error(message)
      } finally {
        setRestoringId(null)
      }
    })
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No hay citas en la papelera.</p>
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
            <TableHead>Fecha</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Eliminada</TableHead>
            <TableHead>Eliminada por</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((apt) => (
            <TableRow key={apt.id}>
              <TableCell className="font-medium">{apt.contactName}</TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[160px]">
                {apt.propertyTitle}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Intl.DateTimeFormat("es-BO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(apt.date + "T12:00:00"))}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {apt.time} – {apt.endTime}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {apt.deletedAt
                  ? new Intl.DateTimeFormat("es-BO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(apt.deletedAt))
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {apt.deletedBy ? (
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm">
                      {apt.deletedBy.userName ?? "—"}
                    </span>
                    {apt.deletedBy.userEmail && (
                      <span className="text-xs">{apt.deletedBy.userEmail}</span>
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
                  disabled={isPending}
                  onClick={() => handleRestore(apt.id)}
                >
                  <ArchiveRestore className="mr-2 size-4" />
                  {isPending && restoringId === apt.id
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
