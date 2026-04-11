"use client"

import { MessageCircle, CalendarPlus, Home, UserCheck } from "lucide-react"
import { AnalyticsStatCard } from "@/components/analytics/analytics-stat-card"
import { BotActivityArea } from "@/components/analytics/charts/bot-activity-area"
import { BotFunnel } from "@/components/analytics/charts/bot-funnel"
import { AppointmentOutcomesDonut } from "@/components/analytics/charts/appointment-outcomes-donut"
import { EngagementHeatmap } from "@/components/analytics/charts/engagement-heatmap"
import type {
  StatCardData,
  TimeSeriesPoint,
  BotFunnelStep,
  HeatmapCell,
} from "@/lib/types/analytics"

interface MyActivityTabProps {
  stats: StatCardData[]
  activityByDay: TimeSeriesPoint[]
  funnel: BotFunnelStep[]
  appointmentOutcomes: {
    status: string
    label: string
    count: number
    percentage: number
    fill: string
  }[]
  heatmap: HeatmapCell[]
}

const STAT_ICONS = [MessageCircle, CalendarPlus, Home, UserCheck]

export function MyActivityTab({
  stats,
  activityByDay,
  funnel,
  appointmentOutcomes,
  heatmap,
}: MyActivityTabProps) {
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
        <BotFunnel data={funnel} />
        <AppointmentOutcomesDonut data={appointmentOutcomes} />
      </div>

      <EngagementHeatmap data={heatmap} />
    </div>
  )
}
