import { getLeads } from "@/lib/data/leads"
import { getProperties } from "@/lib/data/properties"
import { getAppointments, getAllActivities, getUnreadNotificationCount } from "@/lib/data/bot"
import { LEAD_STATUS_LABELS } from "@/lib/constants/lead"
import { SOURCE_LABELS } from "@/lib/constants/sources"
import type { LeadStatus } from "@/lib/types/lead"

export async function getDashboardStats() {
  const [leads, properties, appointments, unreadNotifications] = await Promise.all([
    getLeads(),
    getProperties(),
    getAppointments(),
    getUnreadNotificationCount(),
  ])

  const totalLeads = leads.length
  const newLeadsCount = leads.filter((l) => l.status === "nuevo").length
  const totalProperties = properties.length
  const activePropertiesCount = properties.filter((p) => p.status === "activa").length
  const totalAppointments = appointments.length
  const pendingAppointmentsCount = appointments.filter(
    (a) => a.status === "solicitada" || a.status === "confirmada"
  ).length
  const closedCount = leads.filter((l) => l.status === "cerrado").length
  const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0

  return {
    totalLeads,
    newLeadsCount,
    totalProperties,
    activePropertiesCount,
    totalAppointments,
    pendingAppointmentsCount,
    unreadNotifications,
    conversionRate,
  }
}

export async function getLeadsBySource() {
  const leads = await getLeads()
  const counts: Record<string, number> = {}

  for (const lead of leads) {
    const key = lead.source ?? "otro"
    counts[key] = (counts[key] || 0) + 1
  }

  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      label: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? "Otro",
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getLeadsByStatus() {
  const leads = await getLeads()
  const counts: Record<string, number> = {}

  for (const lead of leads) {
    counts[lead.status] = (counts[lead.status] || 0) + 1
  }

  const statusOrder: LeadStatus[] = ["nuevo", "contactado", "interesado", "cerrado", "descartado"]
  const colors: Record<LeadStatus, string> = {
    nuevo: "hsl(217, 91%, 60%)",
    contactado: "hsl(45, 93%, 47%)",
    interesado: "hsl(142, 71%, 45%)",
    cerrado: "hsl(271, 91%, 65%)",
    descartado: "hsl(0, 0%, 60%)",
  }

  return statusOrder.map((status) => ({
    status,
    label: LEAD_STATUS_LABELS[status],
    count: counts[status] || 0,
    fill: colors[status],
  }))
}

export async function getPropertyStatusDistribution() {
  const properties = await getProperties()
  const counts: Record<string, number> = {}

  for (const prop of properties) {
    counts[prop.status] = (counts[prop.status] || 0) + 1
  }

  return Object.entries(counts).map(([status, count]) => ({
    status,
    label: status,
    count,
  }))
}

export async function getUpcomingAppointments() {
  const appointments = await getAppointments()

  return appointments
    .filter((a) => a.status === "solicitada" || a.status === "confirmada")
    .sort((a, b) => {
      const dateA = `${a.date}T${a.time}`
      const dateB = `${b.date}T${b.time}`
      return dateA.localeCompare(dateB)
    })
}

export async function getRecentActivities(limit: number = 8) {
  const activities = await getAllActivities()
  return activities.slice(0, limit)
}
