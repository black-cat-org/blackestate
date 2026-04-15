"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppointmentCard } from "@/features/appointments/presentation/components/appointment-card"
import { getLeadColor, getLeadColorLight } from "@/lib/utils/lead-colors"
import { formatCalendarTime } from "@/lib/utils/relative-time"
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from "@/lib/constants/bot"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"

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
  return day === 0 ? 6 : day - 1
}

function formatYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function StripedBackground({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) return null

  const colors = appointments.map((a) => getLeadColorLight(a.leadId))
  const pct = 100 / colors.length

  const gradient = colors
    .map((c, i) => `${c} ${i * pct}% ${(i + 1) * pct}%`)
    .join(", ")

  return (
    <div
      className="absolute inset-0 opacity-50"
      style={{ background: `linear-gradient(to right, ${gradient})` }}
    />
  )
}

function formatSelectedDate(dateStr: string): string {
  return formatCalendarTime(dateStr + "T12:00:00")
}

export function AppointmentsCalendar({ appointments, onUpdate }: AppointmentsCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayStr = formatYMD(today.getFullYear(), today.getMonth(), today.getDate())
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const apt of appointments) {
      const existing = map.get(apt.date) || []
      existing.push(apt)
      map.set(apt.date, existing)
    }
    return map
  }, [appointments])

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date >= todayStr && a.status !== "cancelled" && a.status !== "completed")
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  }, [appointments, todayStr])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const selectedAppointments = appointmentsByDate.get(selectedDate) || []

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) } else { setMonth(month - 1) }
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) } else { setMonth(month + 1) }
  }

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="space-y-3">
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

        <div className="rounded-lg border">
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[52px] border-b border-r p-1.5 last:border-r-0" />
            ))}
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
                  className={`relative min-h-[52px] border-b border-r p-1.5 cursor-pointer transition-colors ${
                    (cellIndex + 1) % 7 === 0 ? "border-r-0" : ""
                  } ${isSelected ? "ring-2 ring-primary ring-inset" : "hover:bg-accent/30"}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <StripedBackground appointments={dayAppointments} />
                  <span
                    className={`relative z-10 text-xs font-medium ${
                      isToday
                        ? "inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : dayAppointments.length > 0
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Two columns: selected day (left, capped width) + upcoming (right) */}
      <div className="grid gap-0 lg:grid-cols-[1fr_auto_1fr]">
        <div className="max-w-md space-y-3">
          <h4 className="text-sm font-semibold capitalize">
            {formatSelectedDate(selectedDate)}
            {selectedAppointments.length > 0 && (
              <span className="text-muted-foreground font-normal"> — {selectedAppointments.length} cita{selectedAppointments.length !== 1 ? "s" : ""}</span>
            )}
          </h4>
          {selectedAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay citas para este día.</p>
          ) : (
            <div className="space-y-2">
              {selectedAppointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} onUpdate={onUpdate} />
              ))}
            </div>
          )}
        </div>

        <div className="mx-6 hidden w-px bg-border lg:block" />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Próximas citas</h4>
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay citas próximas.</p>
          ) : (
            <div className="space-y-0">
              {upcomingAppointments.map((apt, i) => {
                const prevApt = i > 0 ? upcomingAppointments[i - 1] : null
                const showDateHeader = !prevApt || prevApt.date !== apt.date
                const isLastInDay =
                  i === upcomingAppointments.length - 1 ||
                  upcomingAppointments[i + 1].date !== apt.date

                return (
                  <div key={apt.id}>
                    {showDateHeader && (
                      <p className={`text-[11px] font-medium text-muted-foreground capitalize ${i > 0 ? "mt-3" : ""}`}>
                        {formatCalendarTime(apt.date + "T12:00:00")}
                      </p>
                    )}
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2.5 px-2 py-1.5 text-left rounded-md transition-colors hover:bg-accent/50 ${
                        apt.date === selectedDate ? "bg-accent/30" : ""
                      }`}
                      onClick={() => setSelectedDate(apt.date)}
                    >
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center self-stretch">
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: getLeadColor(apt.leadId) }}
                        />
                        {!isLastInDay && (
                          <div className="flex-1 w-px bg-border mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{apt.leadName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{apt.time}</span>
                          <span className={`text-[9px] px-1 py-0 rounded shrink-0 ${APPOINTMENT_STATUS_COLORS[apt.status]}`}>
                            {APPOINTMENT_STATUS_LABELS[apt.status]}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{apt.propertyTitle}</p>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
