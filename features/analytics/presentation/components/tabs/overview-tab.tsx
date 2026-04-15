"use client"

import { Users, TrendingUp, DollarSign, Target } from "lucide-react"
import { AnalyticsStatCard } from "@/features/analytics/presentation/components/analytics-stat-card"
import { LeadsTrendChart } from "@/features/analytics/presentation/components/charts/leads-trend-chart"
import { ConversionsByMonthChart } from "@/features/analytics/presentation/components/charts/conversions-by-month-chart"
import { SourceDonutChart } from "@/features/analytics/presentation/components/charts/source-donut-chart"
import { AlertsPanel } from "@/features/analytics/presentation/components/alerts-panel"
import type { StatCardData, TimeSeriesPoint, AlertItem } from "@/features/analytics/domain/analytics.entity"

interface OverviewTabProps {
  stats: StatCardData[]
  leadsTrend: TimeSeriesPoint[]
  conversionsByMonth: TimeSeriesPoint[]
  sourceDistribution: { source: string; label: string; count: number; percentage: number }[]
  alerts: AlertItem[]
  highlights: string[]
}

const STAT_ICONS = [Users, TrendingUp, DollarSign, Target]

export function OverviewTab({ stats, leadsTrend, conversionsByMonth, sourceDistribution, alerts, highlights }: OverviewTabProps) {
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
        <LeadsTrendChart data={leadsTrend} />
        <ConversionsByMonthChart data={conversionsByMonth} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SourceDonutChart data={sourceDistribution} />
        <AlertsPanel alerts={alerts} highlights={highlights} />
      </div>
    </div>
  )
}
