"use server"

import {
  getOverviewStats,
  getInquiriesTrend,
  getConversionsByMonth,
  getInquiriesSourceDistribution,
  getAlerts,
  getHighlights,
  getInquiriesStats,
  getConversionFunnel,
  getInquiriesBySourceOverTime,
  getConversionBySource,
  getPipelineVelocity,
  getPipelineExits,
  getBotEngagement,
  getInquiriesByPropertyType,
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
  getAgentManualStats,
  getAgentActivityByDay,
  getAgentFunnel,
  getAgentHeatmap,
  getAppointmentOutcomes,
} from "@/features/analytics/infrastructure/analytics.service"

// Re-export types from domain.
export type {
  DateRangePreset,
  DateRange,
  StatCardData,
  FunnelStep,
  TimeSeriesPoint,
  SourceMetric,
  PropertyRanking,
  ZonePricing,
  PipelineStage,
  FinancialOperation,
  HeatmapCell,
  BotFunnelStep,
  AlertItem,
} from "@/features/analytics/domain/analytics.entity"

// ============================================================
// Composite action — single Promise.all under the hood. Mirrors the
// dashboard's `getDashboardDataAction` pattern (R37): one fetch per
// page render so the same Inquiry / Deal / Property / Appointment
// arrays feed every chart without redundant round-trips.
// ============================================================

export async function getAnalyticsDataAction() {
  const [
    overviewStats,
    inquiriesTrend,
    conversionsByMonth,
    sourceDistribution,
    alerts,
    highlights,
    inquiriesStats,
    conversionFunnel,
    inquiriesBySourceOverTime,
    conversionBySource,
    inquiriesByPropertyType,
    propertiesStats,
    inventoryStatus,
    priceByZone,
    typeDistribution,
    pricePerM2,
    topProperties,
    priceTrend,
    financialStats,
    revenueByMonth,
    pipeline,
    commissionsBySource,
    commissionsByType,
    topOperations,
    botStats,
    botActivityByDay,
    botFunnel,
    engagementHeatmap,
    appointmentOutcomes,
    botEngagement,
    agentStats,
    agentActivityByDay,
    agentFunnel,
    agentHeatmap,
  ] = await Promise.all([
    getOverviewStats(),
    getInquiriesTrend(),
    getConversionsByMonth(),
    getInquiriesSourceDistribution(),
    getAlerts(),
    getHighlights(),
    getInquiriesStats(),
    getConversionFunnel(),
    getInquiriesBySourceOverTime(),
    getConversionBySource(),
    getInquiriesByPropertyType(),
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
    getAgentManualStats(),
    getAgentActivityByDay(),
    getAgentFunnel(),
    getAgentHeatmap(),
  ])

  return {
    overviewData: {
      stats: overviewStats,
      inquiriesTrend,
      conversionsByMonth,
      sourceDistribution,
      alerts,
      highlights,
    },
    inquiriesData: {
      stats: inquiriesStats,
      conversionFunnel,
      inquiriesBySourceOverTime,
      conversionBySource,
      inquiriesByPropertyType,
    },
    propertiesData: {
      stats: propertiesStats,
      inventoryStatus,
      priceByZone,
      typeDistribution,
      pricePerM2,
      topProperties,
      priceTrend,
    },
    financialData: {
      stats: financialStats,
      revenueByMonth,
      pipeline,
      commissionsBySource,
      commissionsByType,
      topOperations,
    },
    botData: {
      stats: botStats,
      activityByDay: botActivityByDay,
      botFunnel,
      heatmap: engagementHeatmap,
      botEngagement,
    },
    myActivityData: {
      stats: agentStats,
      activityByDay: agentActivityByDay,
      funnel: agentFunnel,
      appointmentOutcomes,
      heatmap: agentHeatmap,
    },
  }
}

// ============================================================
// Overview tab actions
// ============================================================

export async function getOverviewStatsAction() {
  return getOverviewStats()
}

export async function getInquiriesTrendAction() {
  return getInquiriesTrend()
}

export async function getConversionsByMonthAction() {
  return getConversionsByMonth()
}

export async function getInquiriesSourceDistributionAction() {
  return getInquiriesSourceDistribution()
}

export async function getAlertsAction() {
  return getAlerts()
}

export async function getHighlightsAction() {
  return getHighlights()
}

// ============================================================
// Inquiries tab actions (post-R36; previously "Leads tab")
// ============================================================

export async function getInquiriesStatsAction() {
  return getInquiriesStats()
}

export async function getConversionFunnelAction() {
  return getConversionFunnel()
}

export async function getInquiriesBySourceOverTimeAction() {
  return getInquiriesBySourceOverTime()
}

export async function getConversionBySourceAction() {
  return getConversionBySource()
}

export async function getPipelineVelocityAction() {
  return getPipelineVelocity()
}

export async function getPipelineExitsAction() {
  return getPipelineExits()
}

export async function getBotEngagementAction() {
  return getBotEngagement()
}

export async function getInquiriesByPropertyTypeAction() {
  return getInquiriesByPropertyType()
}

// ============================================================
// Properties tab actions
// ============================================================

export async function getPropertiesStatsAction() {
  return getPropertiesStats()
}

export async function getInventoryStatusAction() {
  return getInventoryStatus()
}

export async function getAvgPriceByZoneAction() {
  return getAvgPriceByZone()
}

export async function getPropertyTypeDistributionAction() {
  return getPropertyTypeDistribution()
}

export async function getPricePerM2ByZoneAction() {
  return getPricePerM2ByZone()
}

export async function getTopPropertiesAction() {
  return getTopProperties()
}

export async function getPriceTrendByZoneAction() {
  return getPriceTrendByZone()
}

// ============================================================
// Financial tab actions
// ============================================================

export async function getFinancialStatsAction() {
  return getFinancialStats()
}

export async function getRevenueByMonthAction() {
  return getRevenueByMonth()
}

export async function getPipelineByStageAction() {
  return getPipelineByStage()
}

export async function getCommissionsBySourceAction() {
  return getCommissionsBySource()
}

export async function getCommissionsByOperationTypeAction() {
  return getCommissionsByOperationType()
}

export async function getTopOperationsAction() {
  return getTopOperations()
}

// ============================================================
// Bot tab actions
// ============================================================

export async function getBotStatsAction() {
  return getBotStats()
}

export async function getBotActivityByDayAction() {
  return getBotActivityByDay()
}

export async function getBotFunnelAction() {
  return getBotFunnel()
}

export async function getEngagementHeatmapAction() {
  return getEngagementHeatmap()
}

// ============================================================
// My Activity tab actions
// ============================================================

export async function getAgentManualStatsAction() {
  return getAgentManualStats()
}

export async function getAgentActivityByDayAction() {
  return getAgentActivityByDay()
}

export async function getAgentFunnelAction() {
  return getAgentFunnel()
}

export async function getAgentHeatmapAction() {
  return getAgentHeatmap()
}

export async function getAppointmentOutcomesAction() {
  return getAppointmentOutcomes()
}
