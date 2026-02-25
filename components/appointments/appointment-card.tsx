"use client"

import { useRouter } from "next/navigation"
import { Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_TRANSITIONS,
} from "@/lib/constants/bot"
import { updateAppointmentStatus } from "@/lib/data/bot"
import { toast } from "sonner"
import type { Appointment, AppointmentStatus } from "@/lib/types/bot"

interface AppointmentCardProps {
  appointment: Appointment
  onUpdate: (id: string, updates: Partial<Appointment>) => void
  compact?: boolean
}

export function AppointmentCard({ appointment, onUpdate, compact }: AppointmentCardProps) {
  const router = useRouter()
  const transitions = APPOINTMENT_STATUS_TRANSITIONS[appointment.status]

  async function handleTransition(newStatus: AppointmentStatus) {
    try {
      const updated = await updateAppointmentStatus(appointment.id, newStatus)
      onUpdate(appointment.id, updated)
      toast.success(`Cita ${APPOINTMENT_STATUS_LABELS[newStatus].toLowerCase()}`)
    } catch {
      toast.error("Error al actualizar la cita")
    }
  }

  return (
    <Card
      className="cursor-pointer gap-0 py-0 transition-colors hover:bg-accent/50"
      onClick={() => router.push(`/dashboard/contacts/${appointment.leadId}`)}
    >
      <CardContent className={compact ? "p-3!" : "p-4!"}>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{appointment.leadName}</p>
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
            {!compact && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {appointment.date}
              </span>
            )}
          </div>
          {transitions.length > 0 && (
            <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
              {transitions.map((t) => (
                <Button
                  key={t.status}
                  variant={t.status === "cancelada" ? "outline" : "default"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleTransition(t.status)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
