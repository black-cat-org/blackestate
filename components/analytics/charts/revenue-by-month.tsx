"use client"

import { Bar, Line, ComposedChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const chartConfig = {
  ingreso: { label: "Ingresos", color: "hsl(142, 71%, 45%)" },
  meta: { label: "Meta", color: "hsl(0, 0%, 60%)" },
} satisfies ChartConfig

interface RevenueByMonthProps {
  data: TimeSeriesPoint[]
}

export function RevenueByMonth({ data }: RevenueByMonthProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ingresos por mes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ComposedChart data={data} margin={{ left: 0 }}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="ingreso" fill="var(--color-ingreso)" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="meta" stroke="var(--color-meta)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
