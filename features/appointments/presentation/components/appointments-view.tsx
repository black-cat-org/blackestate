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
import type { Deal } from "@/features/deals/domain/deal.entity"

interface AppointmentsViewProps {
  appointments: Appointment[]
  /**
   * Active Deals (non-terminal, non-deleted) used by both the create
   * dialog (selecting which Deal a new appointment hangs off) and the
   * filter dropdown ("show only appointments tied to deal X"). The
   * parent page fetches them via `getDealsAction()` post-R34. The
   * property filter dropdown derives its options from the
   * appointments themselves (each carries its `propertyId` +
   * `propertyTitle`), so we don't need a separate Property[] prop.
   */
  deals: Deal[]
}

export function AppointmentsView({ appointments: initialAppointments, deals }: AppointmentsViewProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "kanban">("calendar")
  const [appointments, setAppointments] = useState(initialAppointments)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterOrigin, setFilterOrigin] = useState("all")
  const [filterProperty, setFilterProperty] = useState("all")
  const [filterDeal, setFilterDeal] = useState("all")
  const [search, setSearch] = useState("")

  const filteredAppointments = useMemo(() => {
    const q = search.toLowerCase()
    return appointments.filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false
      if (filterOrigin !== "all" && a.origin !== filterOrigin) return false
      if (filterProperty !== "all" && a.propertyId !== filterProperty) return false
      if (filterDeal !== "all" && a.dealId !== filterDeal) return false
      if (q && !a.contactName.toLowerCase().includes(q) && !a.propertyTitle.toLowerCase().includes(q)) return false
      return true
    })
  }, [appointments, filterStatus, filterOrigin, filterProperty, filterDeal, search])

  const uniqueDealIds = [...new Set(appointments.map((a) => a.dealId))]
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
            placeholder="Buscar por contacto o propiedad..."
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
          <Select value={filterDeal} onValueChange={setFilterDeal}>
            <SelectTrigger className="w-auto min-w-[150px]">
              <SelectValue placeholder="Negocio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los negocios</SelectItem>
              {uniqueDealIds.map((id) => {
                const apt = appointments.find((a) => a.dealId === id)
                // Show "Contact · Property" to disambiguate when the same
                // contact has deals across multiple properties — without
                // the property suffix two rows would look identical.
                const label = apt
                  ? `${apt.contactName}${apt.propertyTitle ? ` · ${apt.propertyTitle}` : ""}`
                  : id
                return <SelectItem key={id} value={id}>{label}</SelectItem>
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
        deals={deals}
        onCreated={handleCreated}
      />
    </div>
  )
}
