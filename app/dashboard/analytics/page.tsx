import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import {
  getOverviewStats,
  getLeadsTrend,
  getConversionsByMonth,
  getLeadsSourceDistribution,
  getAlerts,
  getLeadsStats,
  getConversionFunnel,
  getLeadsBySourceOverTime,
  getConversionBySource,
  getResponseTimeMetrics,
  getLeadsByPropertyType,
} from "@/lib/data/analytics"

export default async function AnalyticsPage() {
  const [
    overviewStats, leadsTrend, conversionsByMonth, sourceDistribution, alerts,
    leadsStats, conversionFunnel, leadsBySourceOverTime, conversionBySource, responseTime, leadsByPropertyType,
  ] = await Promise.all([
    getOverviewStats(),
    getLeadsTrend(),
    getConversionsByMonth(),
    getLeadsSourceDistribution(),
    getAlerts(),
    getLeadsStats(),
    getConversionFunnel(),
    getLeadsBySourceOverTime(),
    getConversionBySource(),
    getResponseTimeMetrics(),
    getLeadsByPropertyType(),
  ])

  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Analiticas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <AnalyticsContent
          overviewData={{ stats: overviewStats, leadsTrend, conversionsByMonth, sourceDistribution, alerts }}
          leadsData={{ stats: leadsStats, conversionFunnel, leadsBySourceOverTime, conversionBySource, responseTime, leadsByPropertyType }}
        />
      </div>
    </>
  )
}
