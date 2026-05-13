"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Clock,
  MapPin,
  MessageCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_TRANSITIONS,
  APPOINTMENT_ORIGIN_LABELS,
  APPOINTMENT_ORIGIN_COLORS,
} from "@/lib/constants/bot"
import { AGENT_CONFIG } from "@/lib/constants/agent"
import {
  updateAppointmentStatusAction,
  deleteAppointmentAction,
} from "@/features/appointments/presentation/actions"
import { AppointmentEditDialog } from "@/features/appointments/presentation/components/appointment-edit-dialog"
import { getLeadColor } from "@/lib/utils/lead-colors"
import { toast } from "sonner"
import type {
  Appointment,
  AppointmentStatus,
} from "@/features/appointments/domain/appointment.entity"

interface AppointmentCardProps {
  appointment: Appointment
  onUpdate: (id: string, updates: Partial<Appointment>) => void
  onDelete: (id: string) => void
  showDate?: boolean
}

export function AppointmentCard({
  appointment,
  onUpdate,
  onDelete,
  showDate,
}: AppointmentCardProps) {
  const router = useRouter()
  const [notesOpen, setNotesOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const leadColor = getLeadColor(appointment.leadId)
  const transitions = APPOINTMENT_STATUS_TRANSITIONS[appointment.status]
  const hasNotes = !!appointment.notes

  async function handleTransition(newStatus: AppointmentStatus) {
    try {
      const updated = await updateAppointmentStatusAction(
        appointment.id,
        newStatus,
      )
      onUpdate(appointment.id, updated)
      toast.success(
        `Cita ${APPOINTMENT_STATUS_LABELS[newStatus].toLowerCase()}`,
      )
    } catch {
      toast.error("Error al actualizar la cita")
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteAppointmentAction(appointment.id)
      onDelete(appointment.id)
      setDeleteOpen(false)
      toast.success("Cita eliminada")
      router.refresh()
    } catch {
      toast.error("Error al eliminar la cita")
    } finally {
      setDeleting(false)
    }
  }

  const whatsappUrl = `https://wa.me/${(appointment.leadPhone ?? "").replace(/[\s+\-]/g, "")}?text=${encodeURIComponent(
    AGENT_CONFIG.whatsappMessage(appointment.propertyTitle, appointment.propertyId),
  )}`

  return (
    <>
      <Card className="gap-0 py-0 transition-colors hover:bg-accent/50">
        <CardContent className="p-3!">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-semibold text-left hover:underline"
                onClick={() => router.push(`/dashboard/leads/${appointment.leadId}`)}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: leadColor }}
                />
                {appointment.leadName}
              </button>
              <div className="flex items-center gap-1">
                <Badge
                  className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${APPOINTMENT_ORIGIN_COLORS[appointment.origin]}`}
                >
                  {APPOINTMENT_ORIGIN_LABELS[appointment.origin]}
                </Badge>
                <Badge
                  className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${APPOINTMENT_STATUS_COLORS[appointment.status]}`}
                >
                  {APPOINTMENT_STATUS_LABELS[appointment.status]}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label="Más acciones"
                    >
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="mr-2 size-3.5" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <p className="text-xs text-muted-foreground truncate">
              {appointment.propertyTitle}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {appointment.time} - {appointment.endTime}
              </span>
              {showDate && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {new Date(appointment.date + "T12:00:00").toLocaleDateString("es-BO", { day: "numeric", month: "short" })}
                </span>
              )}
              {hasNotes && (
                <button
                  type="button"
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                  onClick={() => setNotesOpen(!notesOpen)}
                >
                  <FileText className="size-3" />
                  Notas
                  {notesOpen ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>
              )}
            </div>

            {hasNotes && notesOpen && (
              <div className="rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                {appointment.notes}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {transitions.map((t) => (
                <Button
                  key={t.status}
                  variant={t.status === "confirmed" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleTransition(t.status)}
                >
                  {t.label}
                </Button>
              ))}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <MessageCircle className="size-4" />
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppointmentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        appointment={appointment}
        onUpdated={(updated) => onUpdate(updated.id, updated)}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar cita"
        description={`¿Seguro que quieres eliminar la cita con ${appointment.leadName}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        confirming={deleting}
      />
    </>
  )
}
