"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const chartConfig = {
  won: { label: "Ganados", color: "hsl(142, 71%, 45%)" },
  lost: { label: "Perdidos", color: "hsl(0, 72%, 51%)" },
} satisfies ChartConfig

interface ConversionsByMonthChartProps {
  data: TimeSeriesPoint[]
}

export function ConversionsByMonthChart({ data }: ConversionsByMonthChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conversiones por mes</CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green-500" />Ganado</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" />Perdido</span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ left: 0 }}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="won" fill="var(--color-won)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lost" fill="var(--color-lost)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
