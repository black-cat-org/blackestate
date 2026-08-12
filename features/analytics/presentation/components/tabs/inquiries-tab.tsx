"use client"

import { Users, Clock, Target, TrendingUp, MessageSquare } from "lucide-react"
import { AnalyticsStatCard } from "@/features/analytics/presentation/components/analytics-stat-card"
import { ConversionFunnel } from "@/features/analytics/presentation/components/charts/conversion-funnel"
import { InquiriesBySourceStacked } from "@/features/analytics/presentation/components/charts/inquiries-by-source-stacked"
import { ConversionBySource } from "@/features/analytics/presentation/components/charts/conversion-by-source"
import { InquiriesByPropertyType } from "@/features/analytics/presentation/components/charts/inquiries-by-property-type"
import type { StatCardData, FunnelStep, TimeSeriesPoint, SourceMetric } from "@/features/analytics/domain/analytics.entity"

interface InquiriesTabProps {
  stats: StatCardData[]
  conversionFunnel: FunnelStep[]
  inquiriesBySourceOverTime: TimeSeriesPoint[]
  conversionBySource: SourceMetric[]
  inquiriesByPropertyType: { type: string; label: string; count: number }[]
}

// 5 stats now (post-R36): total, avg close days, Inquiry→Deal,
// Deal→Won, response rate. Icons paired in StatCard slot order.
const STAT_ICONS = [Users, Clock, Target, TrendingUp, MessageSquare]

export function InquiriesTab({ stats, conversionFunnel, inquiriesBySourceOverTime, conversionBySource, inquiriesByPropertyType }: InquiriesTabProps) {
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
        <InquiriesBySourceStacked data={inquiriesBySourceOverTime} />
        <InquiriesByPropertyType data={inquiriesByPropertyType} />
      </div>
    </div>
  )
}
