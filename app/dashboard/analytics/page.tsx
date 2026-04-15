import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { AnalyticsContent } from "@/features/analytics/presentation/components/analytics-content"
import {
  getOverviewStatsAction,
  getLeadsTrendAction,
  getConversionsByMonthAction,
  getLeadsSourceDistributionAction,
  getAlertsAction,
  getHighlightsAction,
  getLeadsStatsAction,
  getConversionFunnelAction,
  getLeadsBySourceOverTimeAction,
  getConversionBySourceAction,
  getLeadsByPropertyTypeAction,
  getPropertiesStatsAction,
  getInventoryStatusAction,
  getAvgPriceByZoneAction,
  getPropertyTypeDistributionAction,
  getPricePerM2ByZoneAction,
  getTopPropertiesAction,
  getPriceTrendByZoneAction,
  getFinancialStatsAction,
  getRevenueByMonthAction,
  getPipelineByStageAction,
  getCommissionsBySourceAction,
  getCommissionsByOperationTypeAction,
  getTopOperationsAction,
  getBotStatsAction,
  getBotActivityByDayAction,
  getBotFunnelAction,
  getEngagementHeatmapAction,
  getAppointmentOutcomesAction,
  getBotEngagementAction,
  getAgentManualStatsAction,
  getAgentActivityByDayAction,
  getAgentFunnelAction,
  getAgentHeatmapAction,
} from "@/features/analytics/presentation/actions"

export default async function AnalyticsPage() {
  const [
    overviewStats, leadsTrend, conversionsByMonth, sourceDistribution, alerts, highlights,
    leadsStats, conversionFunnel, leadsBySourceOverTime, conversionBySource, leadsByPropertyType,
    propertiesStats, inventoryStatus, priceByZone, typeDistribution, pricePerM2, topProperties, priceTrend,
    financialStats, revenueByMonth, pipeline, commissionsBySource, commissionsByType, topOperations,
    botStats, botActivityByDay, botFunnel, engagementHeatmap, appointmentOutcomes, botEngagement,
    agentStats, agentActivityByDay, agentFunnel, agentHeatmap,
  ] = await Promise.all([
    getOverviewStatsAction(),
    getLeadsTrendAction(),
    getConversionsByMonthAction(),
    getLeadsSourceDistributionAction(),
    getAlertsAction(),
    getHighlightsAction(),
    getLeadsStatsAction(),
    getConversionFunnelAction(),
    getLeadsBySourceOverTimeAction(),
    getConversionBySourceAction(),
    getLeadsByPropertyTypeAction(),
    getPropertiesStatsAction(),
    getInventoryStatusAction(),
    getAvgPriceByZoneAction(),
    getPropertyTypeDistributionAction(),
    getPricePerM2ByZoneAction(),
    getTopPropertiesAction(),
    getPriceTrendByZoneAction(),
    getFinancialStatsAction(),
    getRevenueByMonthAction(),
    getPipelineByStageAction(),
    getCommissionsBySourceAction(),
    getCommissionsByOperationTypeAction(),
    getTopOperationsAction(),
    getBotStatsAction(),
    getBotActivityByDayAction(),
    getBotFunnelAction(),
    getEngagementHeatmapAction(),
    getAppointmentOutcomesAction(),
    getBotEngagementAction(),
    getAgentManualStatsAction(),
    getAgentActivityByDayAction(),
    getAgentFunnelAction(),
    getAgentHeatmapAction(),
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
          botData={{ stats: botStats, activityByDay: botActivityByDay, botFunnel, heatmap: engagementHeatmap, botEngagement }}
          myActivityData={{ stats: agentStats, activityByDay: agentActivityByDay, funnel: agentFunnel, appointmentOutcomes, heatmap: agentHeatmap }}
        />
      </div>
    </>
  )
}
