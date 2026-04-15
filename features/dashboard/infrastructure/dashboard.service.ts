import { getLeadsAction } from "@/features/leads/presentation/actions"
import { getPropertiesAction } from "@/features/properties/presentation/actions"
import { getAppointmentsAction } from "@/features/appointments/presentation/actions"
import { getAllActivitiesAction, getUnreadNotificationCountAction } from "@/features/bot/presentation/actions"
import { LEAD_STATUS_LABELS } from "@/lib/constants/lead"
import { SOURCE_LABELS } from "@/lib/constants/sources"
import type { LeadStatus } from "@/features/leads/domain/lead.entity"

export async function getDashboardStats() {
  const [leads, properties, appointments, unreadNotifications] = await Promise.all([
    getLeadsAction(),
    getPropertiesAction(),
    getAppointmentsAction(),
    getUnreadNotificationCountAction(),
  ])

  const totalLeads = leads.length
  const newLeadsCount = leads.filter((l) => l.status === "new").length
  const totalProperties = properties.length
  const activePropertiesCount = properties.filter((p) => p.status === "active").length
  const totalAppointments = appointments.length
  const pendingAppointmentsCount = appointments.filter(
    (a) => a.status === "requested" || a.status === "confirmed"
  ).length
  const closedCount = leads.filter((l) => l.status === "won").length
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
  const leads = await getLeadsAction()
  const counts: Record<string, number> = {}

  for (const lead of leads) {
    const key = lead.source ?? "other"
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
  const leads = await getLeadsAction()
  const counts: Record<string, number> = {}

  for (const lead of leads) {
    counts[lead.status] = (counts[lead.status] || 0) + 1
  }

  const statusOrder: LeadStatus[] = ["new", "contacted", "interested", "won", "lost", "discarded"]
  const colors: Record<LeadStatus, string> = {
    new: "hsl(217, 91%, 60%)",
    contacted: "hsl(45, 93%, 47%)",
    interested: "hsl(271, 91%, 65%)",
    won: "hsl(142, 71%, 45%)",
    lost: "hsl(0, 72%, 51%)",
    discarded: "hsl(0, 0%, 60%)",
  }

  return statusOrder.map((status) => ({
    status,
    label: LEAD_STATUS_LABELS[status],
    count: counts[status] || 0,
    fill: colors[status],
  }))
}

export async function getPropertyStatusDistribution() {
  const properties = await getPropertiesAction()
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
  const appointments = await getAppointmentsAction()

  return appointments
    .filter((a) => a.status === "requested" || a.status === "confirmed")
    .sort((a, b) => {
      const dateA = `${a.date}T${a.time}`
      const dateB = `${b.date}T${b.time}`
      return dateA.localeCompare(dateB)
    })
}

export async function getRecentActivities(limit: number = 8) {
  const activities = await getAllActivitiesAction()
  return activities.slice(0, limit)
}
