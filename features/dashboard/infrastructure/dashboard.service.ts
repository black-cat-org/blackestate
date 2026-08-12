import { getInquiriesAction } from "@/features/inquiries/presentation/actions"
import { getClosedDealsAction } from "@/features/deals/presentation/actions"
import { getPropertiesAction } from "@/features/properties/presentation/actions"
import { getAppointmentsAction } from "@/features/appointments/presentation/actions"
import { getAllActivitiesAction, getUnreadNotificationCountAction } from "@/features/bot/presentation/actions"
import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_SOURCE_LABELS,
  INQUIRY_SOURCE_OTHER_LABEL,
} from "@/lib/constants/inquiry"
import type { Inquiry, InquiryStatus } from "@/features/inquiries/domain/inquiry.entity"

/**
 * Fill colors for the inquiry status funnel chart. Hardcoded HSL here
 * (rather than reading from `INQUIRY_STATUS_BADGE_CLASSES`) because the
 * recharts API needs raw HSL strings, not Tailwind utility classes.
 * Adding a new status forces a compile error via the
 * `Record<InquiryStatus, string>` typing.
 */
const INQUIRY_STATUS_FILL: Record<InquiryStatus, string> = {
  open: "hsl(217, 91%, 60%)",
  promoted: "hsl(142, 71%, 45%)",
  discarded: "hsl(0, 0%, 60%)",
}

const INQUIRY_STATUS_ORDER: InquiryStatus[] = ["open", "promoted", "discarded"]

// ---------------------------------------------------------------------------
// Pure aggregators — take pre-fetched data so the same Inquiry[] array can
// feed multiple charts in a single render without re-fetching. The page
// composer (`getDashboardData`) owns the fetch; these helpers transform.
// ---------------------------------------------------------------------------

function aggregateInquiriesBySource(inquiries: Inquiry[]) {
  const counts: Record<string, number> = {}
  for (const inquiry of inquiries) {
    const key = inquiry.source ?? "other"
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      label:
        INQUIRY_SOURCE_LABELS[source as keyof typeof INQUIRY_SOURCE_LABELS] ??
        INQUIRY_SOURCE_OTHER_LABEL,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

function aggregateInquiriesByStatus(inquiries: Inquiry[]) {
  const counts: Record<string, number> = {}
  for (const inquiry of inquiries) {
    counts[inquiry.status] = (counts[inquiry.status] || 0) + 1
  }
  return INQUIRY_STATUS_ORDER.map((status) => ({
    status,
    label: INQUIRY_STATUS_LABELS[status],
    count: counts[status] || 0,
    fill: INQUIRY_STATUS_FILL[status],
  }))
}

// ---------------------------------------------------------------------------
// Composite — single fetch, then all aggregations share the result. Used by
// the `/dashboard` page composer to keep a single Promise.all + zero
// redundant DB round-trips.
//
// Post-R37 metric vocabulary tracks the Inquiry/Deal split:
//   - `totalInquiries` / `newInquiriesCount` — top-of-funnel volume.
//     An Inquiry is the "interés sin compromiso" Contact-to-Property
//     interaction (formerly conflated with `leads`).
//   - `wonDealsCount` — bottom-of-funnel closed sales. A Deal in
//     `DealStage='won'` is the agent's measurable success outcome.
//   - `conversionRate` — cross-funnel rate: won deals / total inquiries
//     × 100. Single number for "of every 100 consultations I received,
//     how many closed". Crosses populations (inquiries → deals) because
//     that's the real journey; stage-specific conversions are deferred
//     to R36's expanded analytics surface.
// ---------------------------------------------------------------------------

export async function getDashboardData() {
  const [inquiries, closedDeals, properties, appointments, unreadNotifications, activities] =
    await Promise.all([
      getInquiriesAction(),
      getClosedDealsAction(),
      getPropertiesAction(),
      getAppointmentsAction(),
      getUnreadNotificationCountAction(),
      getAllActivitiesAction(),
    ])

  const totalInquiries = inquiries.length
  const newInquiriesCount = inquiries.filter((i) => i.status === "open").length
  const totalProperties = properties.length
  const activePropertiesCount = properties.filter((p) => p.status === "active").length
  const totalAppointments = appointments.length
  const pendingAppointmentsCount = appointments.filter(
    (a) => a.status === "requested" || a.status === "confirmed",
  ).length
  const wonDealsCount = closedDeals.filter((d) => d.stage === "won").length
  const conversionRate =
    totalInquiries > 0 ? (wonDealsCount / totalInquiries) * 100 : 0

  const upcomingAppointments = appointments
    .filter((a) => a.status === "requested" || a.status === "confirmed")
    .sort((a, b) => {
      const dateA = `${a.date}T${a.time}`
      const dateB = `${b.date}T${b.time}`
      return dateA.localeCompare(dateB)
    })

  return {
    stats: {
      totalInquiries,
      newInquiriesCount,
      totalProperties,
      activePropertiesCount,
      totalAppointments,
      pendingAppointmentsCount,
      unreadNotifications,
      wonDealsCount,
      conversionRate,
    },
    inquiriesBySource: aggregateInquiriesBySource(inquiries),
    inquiriesByStatus: aggregateInquiriesByStatus(inquiries),
    upcomingAppointments,
    recentActivities: activities.slice(0, 8),
  }
}

// ---------------------------------------------------------------------------
// Granular functions — kept for reuse by non-dashboard surfaces (none today,
// but the surface may grow). Each call independently fetches; callers that
// need multiple aggregations on the same page should use `getDashboardData`
// instead to avoid redundant round-trips.
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
  const data = await getDashboardData()
  return data.stats
}

export async function getInquiriesBySource() {
  const inquiries = await getInquiriesAction()
  return aggregateInquiriesBySource(inquiries)
}

export async function getInquiriesByStatus() {
  const inquiries = await getInquiriesAction()
  return aggregateInquiriesByStatus(inquiries)
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
