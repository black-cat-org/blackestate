"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"
import type { TimeSeriesPoint } from "@/features/analytics/domain/analytics.entity"

const ZONE_COLORS: Record<string, string> = {
  "Equipetrol": "hsl(217, 91%, 60%)",
  "Urubó": "hsl(142, 70%, 40%)",
  "Las Palmas": "hsl(330, 70%, 50%)",
  "Norte": "hsl(271, 91%, 65%)",
  "Plan 3000": "hsl(25, 80%, 50%)",
  "Montero": "hsl(45, 93%, 47%)",
}

interface PriceTrendLinesProps {
  data: TimeSeriesPoint[]
  zones: string[]
}

export function PriceTrendLines({ data, zones }: PriceTrendLinesProps) {
  const chartConfig = zones.reduce((acc, zone) => {
    acc[zone] = { label: zone, color: ZONE_COLORS[zone] || "hsl(0, 0%, 60%)" }
    return acc
  }, {} as Record<string, { label: string; color: string }>) satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Tendencia de precios por zona"
          helpText="Muestra cómo han cambiado los precios de tus propiedades por zona a lo largo del tiempo. Una línea que sube significa que esa zona está valorizándose. Úsalo para identificar qué zonas están creciendo en valor y orientar mejor a tus clientes."
          subtitle="evolución del precio promedio por zona en el tiempo"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `US$ ${Number(value).toLocaleString("es-BO")}`} />} />
            <ChartLegend content={() => (
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {zones.map((zone) => (
                  <div key={zone} className="flex items-center gap-1.5 text-xs">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: ZONE_COLORS[zone] || "hsl(0, 0%, 60%)" }} />
                    <span className="text-muted-foreground">{zone}</span>
                  </div>
                ))}
              </div>
            )} />
            {zones.map((zone) => (
              <Line key={zone} type="monotone" dataKey={zone} stroke={ZONE_COLORS[zone] || "hsl(0, 0%, 60%)"} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
