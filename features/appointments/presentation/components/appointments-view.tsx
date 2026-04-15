"use client"

import { useState, useMemo } from "react"
import { Calendar, Columns3, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AppointmentsCalendar } from "@/features/appointments/presentation/components/appointments-calendar"
import { AppointmentsKanban } from "@/features/appointments/presentation/components/appointments-kanban"
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants/bot"
import { createAppointmentAction } from "@/features/appointments/presentation/actions"
import { toast } from "sonner"
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
  const [filterProperty, setFilterProperty] = useState("all")
  const [filterLead, setFilterLead] = useState("all")
  const [search, setSearch] = useState("")

  const filteredAppointments = useMemo(() => {
    const q = search.toLowerCase()
    return appointments.filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false
      if (filterProperty !== "all" && a.propertyId !== filterProperty) return false
      if (filterLead !== "all" && a.leadId !== filterLead) return false
      if (q && !a.leadName.toLowerCase().includes(q) && !a.propertyTitle.toLowerCase().includes(q)) return false
      return true
    })
  }, [appointments, filterStatus, filterProperty, filterLead, search])

  const uniqueLeadIds = [...new Set(appointments.map((a) => a.leadId))]
  const uniquePropertyIds = [...new Set(appointments.map((a) => a.propertyId))]

  const [newApt, setNewApt] = useState({
    leadId: "",
    propertyId: "",
    date: "",
    time: "",
    endTime: "",
    notes: "",
  })

  function handleUpdate(id: string, updates: Partial<Appointment>) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    )
  }

  async function handleCreate() {
    const lead = leads.find((l) => l.id === newApt.leadId)
    const property = properties.find((p) => p.id === newApt.propertyId)
    if (!lead || !property || !newApt.date || !newApt.time || !newApt.endTime) {
      toast.warning("Completa los campos requeridos")
      return
    }
    try {
      const apt = await createAppointmentAction({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        propertyId: property.id,
        propertyTitle: property.title,
        date: newApt.date,
        time: newApt.time,
        endTime: newApt.endTime,
        notes: newApt.notes || undefined,
      })
      setAppointments((prev) => [apt, ...prev])
      setDialogOpen(false)
      setNewApt({ leadId: "", propertyId: "", date: "", time: "", endTime: "", notes: "" })
      toast.success("Cita creada")
    } catch {
      toast.error("Error al crear la cita")
    }
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
        <AppointmentsCalendar appointments={filteredAppointments} onUpdate={handleUpdate} />
      ) : (
        <AppointmentsKanban appointments={filteredAppointments} onUpdate={handleUpdate} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lead *</Label>
              <Select value={newApt.leadId} onValueChange={(v) => setNewApt((p) => ({ ...p, leadId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Propiedad *</Label>
              <Select value={newApt.propertyId} onValueChange={(v) => setNewApt((p) => ({ ...p, propertyId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar propiedad" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input type="date" value={newApt.date} onChange={(e) => setNewApt((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora inicio *</Label>
                <Input type="time" value={newApt.time} onChange={(e) => setNewApt((p) => ({ ...p, time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Hora fin *</Label>
                <Input type="time" value={newApt.endTime} onChange={(e) => setNewApt((p) => ({ ...p, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea placeholder="Notas opcionales..." value={newApt.notes} onChange={(e) => setNewApt((p) => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear cita</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
