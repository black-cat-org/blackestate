"use client"

import { Users, TrendingUp, Target, DollarSign } from "lucide-react"
import { AnalyticsStatCard } from "@/features/analytics/presentation/components/analytics-stat-card"
import { InquiriesTrendChart } from "@/features/analytics/presentation/components/charts/inquiries-trend-chart"
import { ConversionsByMonthChart } from "@/features/analytics/presentation/components/charts/conversions-by-month-chart"
import { SourceDonutChart } from "@/features/analytics/presentation/components/charts/source-donut-chart"
import { AlertsPanel } from "@/features/analytics/presentation/components/alerts-panel"
import type { StatCardData, TimeSeriesPoint, AlertItem } from "@/features/analytics/domain/analytics.entity"

interface OverviewTabProps {
  stats: StatCardData[]
  inquiriesTrend: TimeSeriesPoint[]
  conversionsByMonth: TimeSeriesPoint[]
  sourceDistribution: { source: string; label: string; count: number; percentage: number }[]
  alerts: AlertItem[]
  highlights: string[]
}

// Icons paired to overview stat order (post-R36):
// (1) Consultas nuevas → Users, (2) Tasa conversión → TrendingUp,
// (3) Conversión Consulta→Negocio → Target, (4) Comisiones → DollarSign.
const STAT_ICONS = [Users, TrendingUp, Target, DollarSign]

export function OverviewTab({ stats, inquiriesTrend, conversionsByMonth, sourceDistribution, alerts, highlights }: OverviewTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat, i) => (
          <AnalyticsStatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            change={stat.change}
            icon={STAT_ICONS[i]}
            helpText={stat.helpText}
            contextLine={stat.contextLine}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InquiriesTrendChart data={inquiriesTrend} />
        <ConversionsByMonthChart data={conversionsByMonth} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SourceDonutChart data={sourceDistribution} />
        <AlertsPanel alerts={alerts} highlights={highlights} />
      </div>
    </div>
  )
}
