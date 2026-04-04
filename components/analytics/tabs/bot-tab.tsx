"use client"

import { MessageSquare, Percent, Calendar, Send } from "lucide-react"
import { AnalyticsStatCard } from "@/components/analytics/analytics-stat-card"
import { BotActivityArea } from "@/components/analytics/charts/bot-activity-area"
import { BotFunnel } from "@/components/analytics/charts/bot-funnel"
import { EngagementHeatmap } from "@/components/analytics/charts/engagement-heatmap"
import { AppointmentOutcomesDonut } from "@/components/analytics/charts/appointment-outcomes-donut"
import type {
  StatCardData,
  TimeSeriesPoint,
  BotFunnelStep,
  HeatmapCell,
} from "@/lib/types/analytics"

interface BotTabProps {
  stats: StatCardData[]
  activityByDay: TimeSeriesPoint[]
  botFunnel: BotFunnelStep[]
  heatmap: HeatmapCell[]
  appointmentOutcomes: {
    status: string
    label: string
    count: number
    percentage: number
    fill: string
  }[]
}

const STAT_ICONS = [MessageSquare, Percent, Calendar, Send]

export function BotTab({
  stats,
  activityByDay,
  botFunnel,
  heatmap,
  appointmentOutcomes,
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
          />
        ))}
      </div>

      <BotActivityArea data={activityByDay} />

      <div className="grid gap-4 md:grid-cols-2">
        <BotFunnel data={botFunnel} />
        <AppointmentOutcomesDonut data={appointmentOutcomes} />
      </div>

      <EngagementHeatmap data={heatmap} />
    </div>
  )
}
