"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const chartConfig = {
  actual: { label: "Periodo actual", color: "hsl(271, 91%, 65%)" },
  anterior: { label: "Periodo anterior", color: "hsl(0, 0%, 70%)" },
} satisfies ChartConfig

interface LeadsTrendChartProps {
  data: TimeSeriesPoint[]
}

export function LeadsTrendChart({ data }: LeadsTrendChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tendencia de leads</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="anterior" stroke="var(--color-anterior)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
