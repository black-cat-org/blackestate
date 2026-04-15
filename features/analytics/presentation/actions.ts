"use server"

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
  getPipelineVelocity,
  getPipelineExits,
  getBotEngagement,
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
  getAgentManualStats,
  getAgentActivityByDay,
  getAgentFunnel,
  getAgentHeatmap,
  getAppointmentOutcomes,
} from "@/features/analytics/infrastructure/analytics.service"

// Re-export types from domain
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
// Overview tab actions
// ============================================================

export async function getOverviewStatsAction() {
  return getOverviewStats()
}

export async function getLeadsTrendAction() {
  return getLeadsTrend()
}

export async function getConversionsByMonthAction() {
  return getConversionsByMonth()
}

export async function getLeadsSourceDistributionAction() {
  return getLeadsSourceDistribution()
}

export async function getAlertsAction() {
  return getAlerts()
}

export async function getHighlightsAction() {
  return getHighlights()
}

// ============================================================
// Leads tab actions
// ============================================================

export async function getLeadsStatsAction() {
  return getLeadsStats()
}

export async function getConversionFunnelAction() {
  return getConversionFunnel()
}

export async function getLeadsBySourceOverTimeAction() {
  return getLeadsBySourceOverTime()
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

export async function getLeadsByPropertyTypeAction() {
  return getLeadsByPropertyType()
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
