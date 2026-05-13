"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PropertyTrashList } from "@/features/properties/presentation/components/property-trash-list"
import { LeadTrashList } from "@/features/leads/presentation/components/lead-trash-list"
import { AppointmentTrashList } from "@/features/appointments/presentation/components/appointment-trash-list"
import type { Property } from "@/features/properties/domain/property.entity"
import type { Lead } from "@/features/leads/domain/lead.entity"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"

type ActiveTab = "properties" | "leads" | "appointments"

interface TrashContentProps {
  properties: Property[]
  leads: Lead[]
  appointments: Appointment[]
  /** Active tab on first paint — driven by `?tab=` searchParam from server. */
  initialTab?: ActiveTab
}

export function TrashContent({
  properties,
  leads,
  appointments,
  initialTab = "properties",
}: TrashContentProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab)
  const [query, setQuery] = useState("")

  const normalizedQuery = query.trim().toLowerCase()

  const filteredProperties = useMemo(() => {
    if (!normalizedQuery) return properties
    return properties.filter((p) =>
      [p.title, p.address.city, p.address.street]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(normalizedQuery)),
    )
  }, [properties, normalizedQuery])

  const filteredLeads = useMemo(() => {
    if (!normalizedQuery) return leads
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.propertyTitle]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(normalizedQuery)),
    )
  }, [leads, normalizedQuery])

  const filteredAppointments = useMemo(() => {
    if (!normalizedQuery) return appointments
    return appointments.filter((a) =>
      [a.leadName, a.propertyTitle]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(normalizedQuery)),
    )
  }, [appointments, normalizedQuery])

  const searchPlaceholder: Record<ActiveTab, string> = {
    properties: "Buscar por título, ciudad…",
    leads: "Buscar por nombre, email, teléfono…",
    appointments: "Buscar por lead o propiedad…",
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as ActiveTab)}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="properties">
            Propiedades
            <Badge variant="secondary" className="ml-2">
              {properties.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="leads">
            Leads
            <Badge variant="secondary" className="ml-2">
              {leads.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="appointments">
            Citas
            <Badge variant="secondary" className="ml-2">
              {appointments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder={searchPlaceholder[activeTab]}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <TabsContent value="properties">
        <PropertyTrashList properties={filteredProperties} />
      </TabsContent>
      <TabsContent value="leads">
        <LeadTrashList leads={filteredLeads} />
      </TabsContent>
      <TabsContent value="appointments">
        <AppointmentTrashList appointments={filteredAppointments} />
      </TabsContent>
    </Tabs>
  )
}
