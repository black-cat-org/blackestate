export type DateRangePreset = "7d" | "30d" | "90d" | "this_month" | "this_year" | "custom"

export interface DateRange {
  from: Date
  to: Date
}

export interface StatCardData {
  title: string
  value: string | number
  subtitle?: string
  change?: number // percentage change vs previous period
  helpText?: string
  contextLine?: string
}

export interface FunnelStep {
  label: string
  value: number
  fill: string
}

export interface TimeSeriesPoint {
  date: string
  [key: string]: string | number
}

export interface SourceMetric {
  source: string
  label: string
  count: number
  conversionRate: number
  revenue: number
}

export interface PropertyRanking {
  id: string
  title: string
  leads: number
  visits: number
  appointments: number
}

export interface ZonePricing {
  zone: string
  avgPrice: number
  avgPricePerM2: number
  count: number
}

export interface PipelineStage {
  stage: string
  label: string
  value: number
  probability: number
  fill: string
}

export interface FinancialOperation {
  id: string
  propertyTitle: string
  operationType: string
  propertyValue: number
  commission: number
  source: string
  closedAt: string
}

export interface HeatmapCell {
  day: number // 0=Mon, 6=Sun
  hour: number // 0-23
  value: number
}

export interface BotFunnelStep {
  label: string
  value: number
  percentage: number
  fill: string
}

export interface AlertItem {
  id: string
  type: "warning" | "info" | "urgent"
  title: string
  description: string
  actionUrl?: string
  actionLabel?: string
}
