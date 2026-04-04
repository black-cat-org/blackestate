"use client"

import { Users, Clock, Target, MessageSquare } from "lucide-react"
import { AnalyticsStatCard } from "@/components/analytics/analytics-stat-card"
import { ConversionFunnel } from "@/components/analytics/charts/conversion-funnel"
import { LeadsBySourceStacked } from "@/components/analytics/charts/leads-by-source-stacked"
import { ConversionBySource } from "@/components/analytics/charts/conversion-by-source"
import { LeadsByPropertyType } from "@/components/analytics/charts/leads-by-property-type"
import type { StatCardData, FunnelStep, TimeSeriesPoint, SourceMetric } from "@/lib/types/analytics"

interface LeadsTabProps {
  stats: StatCardData[]
  conversionFunnel: FunnelStep[]
  leadsBySourceOverTime: TimeSeriesPoint[]
  conversionBySource: SourceMetric[]
  leadsByPropertyType: { type: string; label: string; count: number }[]
}

const STAT_ICONS = [Users, Clock, Target, MessageSquare]

export function LeadsTab({ stats, conversionFunnel, leadsBySourceOverTime, conversionBySource, leadsByPropertyType }: LeadsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat, i) => (
          <AnalyticsStatCard key={stat.title} title={stat.title} value={stat.value} subtitle={stat.subtitle} change={stat.change} icon={STAT_ICONS[i]} helpText={stat.helpText} contextLine={stat.contextLine} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ConversionFunnel data={conversionFunnel} />
        <ConversionBySource data={conversionBySource} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LeadsBySourceStacked data={leadsBySourceOverTime} />
        <LeadsByPropertyType data={leadsByPropertyType} />
      </div>
    </div>
  )
}
