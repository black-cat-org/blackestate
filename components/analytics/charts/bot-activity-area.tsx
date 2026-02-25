"use client"

import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  mensajes: { label: "Mensajes", color: "hsl(217, 91%, 60%)" },
  propiedades: { label: "Props. enviadas", color: "hsl(142, 71%, 45%)" },
} satisfies ChartConfig

interface BotActivityAreaProps {
  data: TimeSeriesPoint[]
}

export function BotActivityArea({ data }: BotActivityAreaProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Actividad del bot por día</CardTitle>
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
              dataKey="mensajes"
              stackId="1"
              stroke="var(--color-mensajes)"
              fill="var(--color-mensajes)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="propiedades"
              stackId="1"
              stroke="var(--color-propiedades)"
              fill="var(--color-propiedades)"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
