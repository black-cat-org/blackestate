"use client"

import { Users, Clock, Target, DollarSign } from "lucide-react"
import { AnalyticsStatCard } from "@/components/analytics/analytics-stat-card"
import { ConversionFunnel } from "@/components/analytics/charts/conversion-funnel"
import { LeadsBySourceStacked } from "@/components/analytics/charts/leads-by-source-stacked"
import { ConversionBySource } from "@/components/analytics/charts/conversion-by-source"
import { ResponseTimeGauge } from "@/components/analytics/charts/response-time-gauge"
import { LeadsByPropertyType } from "@/components/analytics/charts/leads-by-property-type"
import type { StatCardData, FunnelStep, TimeSeriesPoint, SourceMetric } from "@/lib/types/analytics"

interface LeadsTabProps {
  stats: StatCardData[]
  conversionFunnel: FunnelStep[]
  leadsBySourceOverTime: TimeSeriesPoint[]
  conversionBySource: SourceMetric[]
  responseTime: { average: number; meta: number; distribution: { fast: number; medium: number; slow: number } }
  leadsByPropertyType: { type: string; label: string; count: number }[]
}

const STAT_ICONS = [Users, Clock, Target, DollarSign]

export function LeadsTab({ stats, conversionFunnel, leadsBySourceOverTime, conversionBySource, responseTime, leadsByPropertyType }: LeadsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <AnalyticsStatCard key={stat.title} title={stat.title} value={stat.value} subtitle={stat.subtitle} change={stat.change} icon={STAT_ICONS[i]} />
        ))}
      </div>

      <ConversionFunnel data={conversionFunnel} />

      <div className="grid gap-4 md:grid-cols-2">
        <LeadsBySourceStacked data={leadsBySourceOverTime} />
        <ConversionBySource data={conversionBySource} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResponseTimeGauge data={responseTime} />
        <LeadsByPropertyType data={leadsByPropertyType} />
      </div>
    </div>
  )
}
