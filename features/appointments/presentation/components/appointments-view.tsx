"use client"

import { useState, useMemo } from "react"
import { Calendar, Columns3, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AppointmentsCalendar } from "@/features/appointments/presentation/components/appointments-calendar"
import { AppointmentsKanban } from "@/features/appointments/presentation/components/appointments-kanban"
import { AppointmentCreateDialog } from "@/features/appointments/presentation/components/appointment-create-dialog"
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_ORIGIN_LABELS,
} from "@/lib/constants/bot"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"
import type { Lead } from "@/features/leads/domain/lead.entity"
import type { Property } from "@/features/properties/domain/property.entity"

interface AppointmentsViewProps {
  appointments: Appointment[]
  leads: Lead[]
  properties: Property[]
}

export function AppointmentsView({ appointments: initialAppointments, leads, properties }: AppointmentsViewProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "kanban">("calendar")
  const [appointments, setAppointments] = useState(initialAppointments)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterOrigin, setFilterOrigin] = useState("all")
  const [filterProperty, setFilterProperty] = useState("all")
  const [filterLead, setFilterLead] = useState("all")
  const [search, setSearch] = useState("")

  const filteredAppointments = useMemo(() => {
    const q = search.toLowerCase()
    return appointments.filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false
      if (filterOrigin !== "all" && a.origin !== filterOrigin) return false
      if (filterProperty !== "all" && a.propertyId !== filterProperty) return false
      if (filterLead !== "all" && a.leadId !== filterLead) return false
      if (q && !a.leadName.toLowerCase().includes(q) && !a.propertyTitle.toLowerCase().includes(q)) return false
      return true
    })
  }, [appointments, filterStatus, filterOrigin, filterProperty, filterLead, search])

  const uniqueLeadIds = [...new Set(appointments.map((a) => a.leadId))]
  const uniquePropertyIds = [...new Set(appointments.map((a) => a.propertyId))]

  function handleUpdate(id: string, updates: Partial<Appointment>) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    )
  }

  function handleDelete(id: string) {
    setAppointments((prev) => prev.filter((a) => a.id !== id))
  }

  function handleCreated(apt: Appointment) {
    setAppointments((prev) => [apt, ...prev])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Citas</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5 mr-1" />
            Nueva cita
          </Button>
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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead o propiedad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="w-auto min-w-[130px]">
              <SelectValue placeholder="Origen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              {Object.entries(APPOINTMENT_ORIGIN_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-auto min-w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLead} onValueChange={setFilterLead}>
            <SelectTrigger className="w-auto min-w-[150px]">
              <SelectValue placeholder="Lead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los leads</SelectItem>
              {uniqueLeadIds.map((id) => {
                const apt = appointments.find((a) => a.leadId === id)
                return <SelectItem key={id} value={id}>{apt?.leadName}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-auto min-w-[170px]">
              <SelectValue placeholder="Propiedad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las propiedades</SelectItem>
              {uniquePropertyIds.map((id) => {
                const apt = appointments.find((a) => a.propertyId === id)
                return <SelectItem key={id} value={id}>{apt?.propertyTitle}</SelectItem>
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <AppointmentsCalendar
          appointments={filteredAppointments}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ) : (
        <AppointmentsKanban
          appointments={filteredAppointments}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      <AppointmentCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        leads={leads}
        properties={properties}
        onCreated={handleCreated}
      />
    </div>
  )
}
