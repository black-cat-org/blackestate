import { Users, Building2, Calendar, TrendingUp } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { InquiriesBySourceChart } from "@/components/dashboard/inquiries-by-source-chart"
import { InquiriesFunnelChart } from "@/components/dashboard/inquiries-funnel-chart"
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { getDashboardDataAction } from "@/features/dashboard/presentation/actions"
import { PendingInvitationsPanel } from "@/features/shared/presentation/components/pending-invitations-panel"

export default async function DashboardPage() {
  const { stats, inquiriesBySource, inquiriesByStatus, upcomingAppointments, recentActivities } =
    await getDashboardDataAction()

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
        <PendingInvitationsPanel />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Consultas totales"
            value={stats.totalInquiries}
            subtitle={`${stats.newInquiriesCount} abiertas`}
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
            subtitle={`${stats.wonDealsCount} ventas ganadas de ${stats.totalInquiries} consultas`}
            icon={TrendingUp}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <InquiriesBySourceChart data={inquiriesBySource} />
          <InquiriesFunnelChart data={inquiriesByStatus} />
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
