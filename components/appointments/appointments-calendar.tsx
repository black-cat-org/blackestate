"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppointmentCard } from "@/components/appointments/appointment-card"
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants/bot"
import type { Appointment } from "@/lib/types/bot"

interface AppointmentsCalendarProps {
  appointments: Appointment[]
  onUpdate: (id: string, updates: Partial<Appointment>) => void
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

function formatYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export function AppointmentsCalendar({ appointments, onUpdate }: AppointmentsCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(
    formatYMD(today.getFullYear(), today.getMonth(), today.getDate())
  )

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const apt of appointments) {
      const existing = map.get(apt.date) || []
      existing.push(apt)
      map.set(apt.date, existing)
    }
    return map
  }, [appointments])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const selectedAppointments = appointmentsByDate.get(selectedDate) || []
  const todayStr = formatYMD(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border">
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month start */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[60px] border-b border-r p-1.5 last:border-r-0" />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = formatYMD(year, month, day)
            const dayAppointments = appointmentsByDate.get(dateStr) || []
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === todayStr
            const cellIndex = firstDay + i

            return (
              <div
                key={day}
                className={`min-h-[60px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-accent/50 ${
                  (cellIndex + 1) % 7 === 0 ? "border-r-0" : ""
                } ${isSelected ? "bg-accent" : ""}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <span
                  className={`text-xs ${
                    isToday
                      ? "inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  {day}
                </span>
                {dayAppointments.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={`size-2 rounded-full ${APPOINTMENT_STATUS_COLORS[apt.status].split(" ")[0]}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day appointments */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">
          {selectedDate === todayStr ? "Hoy" : new Date(selectedDate + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          {selectedAppointments.length > 0 && (
            <span className="text-muted-foreground font-normal"> — {selectedAppointments.length} cita{selectedAppointments.length !== 1 ? "s" : ""}</span>
          )}
        </h4>
        {selectedAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay citas para este día.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {selectedAppointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} onUpdate={onUpdate} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
