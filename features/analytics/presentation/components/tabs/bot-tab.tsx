"use client"

import { MessageSquare, Percent, Calendar, Send } from "lucide-react"
import { AnalyticsStatCard } from "@/features/analytics/presentation/components/analytics-stat-card"
import { BotActivityArea } from "@/features/analytics/presentation/components/charts/bot-activity-area"
import { BotFunnel } from "@/features/analytics/presentation/components/charts/bot-funnel"
import { BotEngagementGauge } from "@/features/analytics/presentation/components/charts/bot-engagement-gauge"
import { EngagementHeatmap } from "@/features/analytics/presentation/components/charts/engagement-heatmap"
import type {
  StatCardData,
  TimeSeriesPoint,
  BotFunnelStep,
  HeatmapCell,
} from "@/features/analytics/domain/analytics.entity"

interface BotTabProps {
  stats: StatCardData[]
  activityByDay: TimeSeriesPoint[]
  botFunnel: BotFunnelStep[]
  heatmap: HeatmapCell[]
  botEngagement: {
    engagementRate: number
    distribution: { interacted: number; viewedOnly: number; noResponse: number }
  }
}

const STAT_ICONS = [MessageSquare, Percent, Calendar, Send]

export function BotTab({
  stats,
  activityByDay,
  botFunnel,
  heatmap,
  botEngagement,
}: BotTabProps) {
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

      <BotActivityArea data={activityByDay} />

      <div className="grid gap-4 md:grid-cols-2">
        <BotFunnel data={botFunnel} />
        <BotEngagementGauge data={botEngagement} />
      </div>

      <EngagementHeatmap data={heatmap} />
    </div>
  )
}
