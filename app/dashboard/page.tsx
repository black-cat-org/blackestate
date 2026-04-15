import { Users, Building2, Calendar, TrendingUp } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart"
import { LeadsFunnelChart } from "@/components/dashboard/leads-funnel-chart"
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import {
  getDashboardStatsAction,
  getLeadsBySourceAction,
  getLeadsByStatusAction,
  getUpcomingAppointmentsAction,
  getRecentActivitiesAction,
} from "@/features/dashboard/presentation/actions"

export default async function DashboardPage() {
  const [stats, leadsBySource, leadsByStatus, upcomingAppointments, recentActivities] =
    await Promise.all([
      getDashboardStatsAction(),
      getLeadsBySourceAction(),
      getLeadsByStatusAction(),
      getUpcomingAppointmentsAction(),
      getRecentActivitiesAction(8),
    ])

  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Leads totales"
            value={stats.totalLeads}
            subtitle={`${stats.newLeadsCount} nuevos`}
            icon={Users}
          />
          <StatCard
            title="Propiedades activas"
            value={stats.activePropertiesCount}
            subtitle={`de ${stats.totalProperties} totales`}
            icon={Building2}
          />
          <StatCard
            title="Citas pendientes"
            value={stats.pendingAppointmentsCount}
            subtitle={`de ${stats.totalAppointments} totales`}
            icon={Calendar}
          />
          <StatCard
            title="Tasa de conversión"
            value={`${stats.conversionRate.toFixed(1)}%`}
            subtitle={`${Math.round(stats.conversionRate * stats.totalLeads / 100)} cerrado de ${stats.totalLeads} leads`}
            icon={TrendingUp}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <LeadsBySourceChart data={leadsBySource} />
          <LeadsFunnelChart data={leadsByStatus} />
        </div>

        {/* Panels */}
        <div className="grid gap-4 md:grid-cols-2">
          <UpcomingAppointments appointments={upcomingAppointments} />
          <RecentActivity activities={recentActivities} />
        </div>
      </div>
    </>
  )
}
