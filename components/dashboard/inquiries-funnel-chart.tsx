"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface InquiriesFunnelChartProps {
  data: { status: string; label: string; count: number; fill: string }[]
}

const chartConfig = {
  count: {
    label: "Consultas",
  },
  open: {
    label: "Abierta",
    color: "hsl(217, 91%, 60%)",
  },
  promoted: {
    label: "Promovida",
    color: "hsl(142, 71%, 45%)",
  },
  discarded: {
    label: "Descartada",
    color: "hsl(0, 0%, 60%)",
  },
} satisfies ChartConfig

export function InquiriesFunnelChart({ data }: InquiriesFunnelChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fill: `var(--color-${d.status})`,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Embudo de consultas</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={chartData} margin={{ bottom: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
