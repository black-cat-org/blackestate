"use client"

import Link from "next/link"
import { Calendar, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from "@/lib/constants/bot"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"

interface UpcomingAppointmentsProps {
  appointments: Appointment[]
}

function formatAppointmentDate(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`)
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Proximas citas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Calendar className="mx-auto size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No hay citas pendientes</p>
          </div>
        ) : (
          <>
            {appointments.map((apt) => (
              <Link
                key={apt.id}
                href={`/dashboard/leads/${apt.leadId}`}
                className="flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Calendar className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{apt.leadName}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${APPOINTMENT_STATUS_COLORS[apt.status]}`}>
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{apt.propertyTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatAppointmentDate(apt.date, apt.time)}
                  </p>
                </div>
              </Link>
            ))}
            <Link
              href="/dashboard/appointments"
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
