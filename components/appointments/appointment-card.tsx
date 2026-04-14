"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, MapPin, MessageCircle, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from "@/lib/constants/bot"
import { AGENT_CONFIG } from "@/lib/constants/agent"
import { updateAppointmentStatus } from "@/lib/data/bot"
import { getLeadColor } from "@/lib/utils/lead-colors"
import { toast } from "sonner"
import type { Appointment, AppointmentStatus } from "@/lib/types/bot"

interface AppointmentCardProps {
  appointment: Appointment
  onUpdate: (id: string, updates: Partial<Appointment>) => void
  showDate?: boolean
}

export function AppointmentCard({ appointment, onUpdate, showDate }: AppointmentCardProps) {
  const router = useRouter()
  const [notesOpen, setNotesOpen] = useState(false)
  const leadColor = getLeadColor(appointment.leadId)
  const isActionable = appointment.status === "requested" || appointment.status === "confirmed"
  const canConfirm = appointment.status === "requested"
  const canCancel = appointment.status === "requested" || appointment.status === "confirmed"
  const hasNotes = !!appointment.notes

  async function handleTransition(newStatus: AppointmentStatus) {
    try {
      const updated = await updateAppointmentStatus(appointment.id, newStatus)
      onUpdate(appointment.id, updated)
      toast.success(`Cita ${APPOINTMENT_STATUS_LABELS[newStatus].toLowerCase()}`)
    } catch {
      toast.error("Error al actualizar la cita")
    }
  }

  const whatsappUrl = `https://wa.me/${appointment.leadPhone.replace(/[\s+\-]/g, "")}?text=${encodeURIComponent(
    AGENT_CONFIG.whatsappMessage(appointment.propertyTitle, appointment.propertyId)
  )}`

  return (
    <Card className="gap-0 py-0 transition-colors hover:bg-accent/50">
      <CardContent className="p-3!">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-semibold text-left hover:underline"
              onClick={() => router.push(`/dashboard/leads/${appointment.leadId}`)}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: leadColor }} />
              {appointment.leadName}
            </button>
            <Badge className={`text-[10px] px-1.5 py-0 border-0 shrink-0 ${APPOINTMENT_STATUS_COLORS[appointment.status]}`}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground truncate">{appointment.propertyTitle}</p>

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
                {notesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
            )}
          </div>

          {hasNotes && notesOpen && (
            <div className="rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
              {appointment.notes}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {isActionable && (
              <>
                {canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleTransition("cancelled")}
                  >
                    Cancelar
                  </Button>
                )}
                {canConfirm && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleTransition("confirmed")}
                  >
                    Confirmar
                  </Button>
                )}
              </>
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="icon" className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50">
                <MessageCircle className="size-4" />
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
