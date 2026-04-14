"use client"

import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartHeader } from "@/components/analytics/chart-header"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const chartConfig = {
  appointments: { label: "Citas agendadas", color: "hsl(271, 91%, 65%)" },
  properties: { label: "Props. enviadas", color: "hsl(142, 71%, 45%)" },
  messages: { label: "Mensajes", color: "hsl(217, 91%, 60%)" },
} satisfies ChartConfig

interface BotActivityAreaProps {
  data: TimeSeriesPoint[]
  title?: string
  helpText?: string
  subtitle?: string
}

export function BotActivityArea({
  data,
  title = "Actividad del bot por día",
  helpText = "Muestra cuántos mensajes envió el bot, cuántas propiedades compartió y cuántas citas agendó cada día. Los picos altos significan días con mucha actividad — generalmente cuando llegaron leads nuevos o el bot activó la cola de propiedades. Te ayuda a entender cuándo trabaja más tu bot.",
  subtitle = "mensajes, propiedades y citas que el bot gestionó cada día",
}: BotActivityAreaProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title={title}
          helpText={helpText}
          subtitle={subtitle}
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/50"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="appointments"
              stackId="1"
              stroke="var(--color-appointments)"
              fill="var(--color-appointments)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="properties"
              stackId="1"
              stroke="var(--color-properties)"
              fill="var(--color-properties)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="messages"
              stackId="1"
              stroke="var(--color-messages)"
              fill="var(--color-messages)"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
