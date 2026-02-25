"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const chartConfig = {
  cerrados: { label: "Cerrados", color: "hsl(142, 71%, 45%)" },
  descartados: { label: "Descartados", color: "hsl(0, 0%, 60%)" },
} satisfies ChartConfig

interface ConversionsByMonthChartProps {
  data: TimeSeriesPoint[]
}

export function ConversionsByMonthChart({ data }: ConversionsByMonthChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conversiones por mes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ left: 0 }}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="cerrados" fill="var(--color-cerrados)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="descartados" fill="var(--color-descartados)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
