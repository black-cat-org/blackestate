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
  getHighlights,
  getLeadsStats,
  getConversionFunnel,
  getLeadsBySourceOverTime,
  getConversionBySource,
  getLeadsByPropertyType,
  getPropertiesStats,
  getInventoryStatus,
  getAvgPriceByZone,
  getPropertyTypeDistribution,
  getPricePerM2ByZone,
  getTopProperties,
  getPriceTrendByZone,
  getFinancialStats,
  getRevenueByMonth,
  getPipelineByStage,
  getCommissionsBySource,
  getCommissionsByOperationType,
  getTopOperations,
  getBotStats,
  getBotActivityByDay,
  getBotFunnel,
  getEngagementHeatmap,
  getAppointmentOutcomes,
  getBotEngagement,
} from "@/lib/data/analytics"

export default async function AnalyticsPage() {
  const [
    overviewStats, leadsTrend, conversionsByMonth, sourceDistribution, alerts, highlights,
    leadsStats, conversionFunnel, leadsBySourceOverTime, conversionBySource, leadsByPropertyType,
    propertiesStats, inventoryStatus, priceByZone, typeDistribution, pricePerM2, topProperties, priceTrend,
    financialStats, revenueByMonth, pipeline, commissionsBySource, commissionsByType, topOperations,
    botStats, botActivityByDay, botFunnel, engagementHeatmap, appointmentOutcomes, botEngagement,
  ] = await Promise.all([
    getOverviewStats(),
    getLeadsTrend(),
    getConversionsByMonth(),
    getLeadsSourceDistribution(),
    getAlerts(),
    getHighlights(),
    getLeadsStats(),
    getConversionFunnel(),
    getLeadsBySourceOverTime(),
    getConversionBySource(),
    getLeadsByPropertyType(),
    getPropertiesStats(),
    getInventoryStatus(),
    getAvgPriceByZone(),
    getPropertyTypeDistribution(),
    getPricePerM2ByZone(),
    getTopProperties(),
    getPriceTrendByZone(),
    getFinancialStats(),
    getRevenueByMonth(),
    getPipelineByStage(),
    getCommissionsBySource(),
    getCommissionsByOperationType(),
    getTopOperations(),
    getBotStats(),
    getBotActivityByDay(),
    getBotFunnel(),
    getEngagementHeatmap(),
    getAppointmentOutcomes(),
    getBotEngagement(),
  ])

  const priceTrendZones = Object.keys(priceTrend[0] || {}).filter(k => k !== "date")

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
          overviewData={{ stats: overviewStats, leadsTrend, conversionsByMonth, sourceDistribution, alerts, highlights }}
          leadsData={{ stats: leadsStats, conversionFunnel, leadsBySourceOverTime, conversionBySource, leadsByPropertyType }}
          propertiesData={{ stats: propertiesStats, inventoryStatus, priceByZone, typeDistribution, pricePerM2, topProperties, priceTrend, priceTrendZones }}
          financialData={{ stats: financialStats, revenueByMonth, pipeline, commissionsBySource, commissionsByType, topOperations }}
          botData={{ stats: botStats, activityByDay: botActivityByDay, botFunnel, heatmap: engagementHeatmap, appointmentOutcomes, botEngagement }}
        />
      </div>
    </>
  )
}
