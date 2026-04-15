"use client"

import { MessageCircle, CalendarPlus, Home, UserCheck } from "lucide-react"
import { AnalyticsStatCard } from "@/features/analytics/presentation/components/analytics-stat-card"
import { BotActivityArea } from "@/features/analytics/presentation/components/charts/bot-activity-area"
import { BotFunnel } from "@/features/analytics/presentation/components/charts/bot-funnel"
import { AppointmentOutcomesDonut } from "@/features/analytics/presentation/components/charts/appointment-outcomes-donut"
import { EngagementHeatmap } from "@/features/analytics/presentation/components/charts/engagement-heatmap"
import type {
  StatCardData,
  TimeSeriesPoint,
  BotFunnelStep,
  HeatmapCell,
} from "@/features/analytics/domain/analytics.entity"

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

      <BotActivityArea
        data={activityByDay}
        title="Tu actividad por día"
        helpText="Muestra cuántos mensajes enviaste, cuántas propiedades compartiste y cuántas citas agendaste manualmente cada día. Los picos altos significan días en los que interviniste más activamente. Te ayuda a entender tus patrones de trabajo."
        subtitle="mensajes, propiedades y citas que gestionaste manualmente cada día"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <BotFunnel
          data={funnel}
          title="Tu efectividad"
          helpText="Muestra qué tan efectivo eres en cada paso del proceso cuando intervienes manualmente. De cada 100 leads que contactas directamente, cuántos vieron una propiedad, cuántos solicitaron cita y cuántos la agendaron. Compáralo con la efectividad del bot para entender dónde agregas más valor."
          subtitleTemplate="de cada 100 leads que contactas, cuántos terminan en una cita"
        />
        <AppointmentOutcomesDonut data={appointmentOutcomes} />
      </div>

      <EngagementHeatmap
        data={heatmap}
        title="Tus horarios de actividad"
        helpText="Muestra en qué días y horarios trabajas más activamente — cuándo envías mensajes, compartes propiedades o agendas citas manualmente. Los cuadros más oscuros significan más actividad. Te ayuda a entender tus patrones de trabajo y si estás cubriendo los horarios en los que tus clientes están más activos."
        subtitle="en qué días y horarios trabajas más"
      />
    </div>
  )
}
