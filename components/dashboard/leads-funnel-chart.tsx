"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface LeadsFunnelChartProps {
  data: { status: string; label: string; count: number; fill: string }[]
}

const chartConfig = {
  count: {
    label: "Leads",
  },
  nuevo: {
    label: "Nuevo",
    color: "hsl(217, 91%, 60%)",
  },
  contactado: {
    label: "Contactado",
    color: "hsl(45, 93%, 47%)",
  },
  interesado: {
    label: "Interesado",
    color: "hsl(142, 71%, 45%)",
  },
  cerrado: {
    label: "Cerrado",
    color: "hsl(271, 91%, 65%)",
  },
  descartado: {
    label: "Descartado",
    color: "hsl(0, 0%, 60%)",
  },
} satisfies ChartConfig

export function LeadsFunnelChart({ data }: LeadsFunnelChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fill: `var(--color-${d.status})`,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Embudo de leads</CardTitle>
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
