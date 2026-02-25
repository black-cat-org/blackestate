"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const ZONE_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(271, 91%, 65%)",
  "hsl(45, 93%, 47%)",
  "hsl(330, 70%, 50%)",
]

interface PriceTrendLinesProps {
  data: TimeSeriesPoint[]
  zones: string[]
}

export function PriceTrendLines({ data, zones }: PriceTrendLinesProps) {
  const chartConfig = zones.reduce((acc, zone, i) => {
    acc[zone] = { label: zone, color: ZONE_COLORS[i % ZONE_COLORS.length] }
    return acc
  }, {} as Record<string, { label: string; color: string }>) satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tendencia de precios por zona</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {zones.map((zone, i) => (
              <Line key={zone} type="monotone" dataKey={zone} stroke={ZONE_COLORS[i % ZONE_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
