"use client"

import { useMemo } from "react"
import { AppointmentCard } from "@/components/appointments/appointment-card"
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from "@/lib/constants/bot"
import type { Appointment, AppointmentStatus } from "@/lib/types/bot"

const COLUMNS: AppointmentStatus[] = ["solicitada", "confirmada", "completada", "cancelada"]

interface AppointmentsKanbanProps {
  appointments: Appointment[]
  onUpdate: (id: string, updates: Partial<Appointment>) => void
}

export function AppointmentsKanban({ appointments, onUpdate }: AppointmentsKanbanProps) {
  const grouped = useMemo(() => {
    const map: Record<AppointmentStatus, Appointment[]> = {
      solicitada: [],
      confirmada: [],
      completada: [],
      cancelada: [],
    }
    for (const apt of appointments) {
      map[apt.status].push(apt)
    }
    return map
  }, [appointments])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((status) => (
        <div key={status} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`size-2.5 rounded-full ${APPOINTMENT_STATUS_COLORS[status].split(" ")[0]}`} />
            <h4 className="text-sm font-semibold">
              {APPOINTMENT_STATUS_LABELS[status]}
            </h4>
            <span className="text-xs text-muted-foreground">
              {grouped[status].length}
            </span>
          </div>
          <div className="space-y-3">
            {grouped[status].length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-xs text-muted-foreground">Sin citas</p>
              </div>
            ) : (
              grouped[status].map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} onUpdate={onUpdate} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
