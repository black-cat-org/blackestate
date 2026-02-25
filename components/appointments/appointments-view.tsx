"use client"

import { useState } from "react"
import { Calendar, Columns3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar"
import { AppointmentsKanban } from "@/components/appointments/appointments-kanban"
import type { Appointment } from "@/lib/types/bot"

interface AppointmentsViewProps {
  appointments: Appointment[]
}

export function AppointmentsView({ appointments: initialAppointments }: AppointmentsViewProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "kanban">("calendar")
  const [appointments, setAppointments] = useState(initialAppointments)

  function handleUpdate(id: string, updates: Partial<Appointment>) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Citas</h2>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "calendar" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="size-3.5 mr-1" />
            Calendario
          </Button>
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setViewMode("kanban")}
          >
            <Columns3 className="size-3.5 mr-1" />
            Kanban
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <AppointmentsCalendar appointments={appointments} onUpdate={handleUpdate} />
      ) : (
        <AppointmentsKanban appointments={appointments} onUpdate={handleUpdate} />
      )}
    </div>
  )
}
