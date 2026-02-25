"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const chartConfig = {
  facebook: { label: "Facebook", color: "hsl(221, 44%, 41%)" },
  instagram: { label: "Instagram", color: "hsl(330, 70%, 50%)" },
  whatsapp: { label: "WhatsApp", color: "hsl(142, 70%, 40%)" },
  tiktok: { label: "TikTok", color: "hsl(0, 0%, 10%)" },
  otro: { label: "Otro", color: "hsl(0, 0%, 60%)" },
} satisfies ChartConfig

interface LeadsBySourceStackedProps {
  data: TimeSeriesPoint[]
}

export function LeadsBySourceStacked({ data }: LeadsBySourceStackedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leads por fuente (mensual)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={data} margin={{ left: 0 }}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="facebook" stackId="a" fill="var(--color-facebook)" />
            <Bar dataKey="instagram" stackId="a" fill="var(--color-instagram)" />
            <Bar dataKey="whatsapp" stackId="a" fill="var(--color-whatsapp)" />
            <Bar dataKey="tiktok" stackId="a" fill="var(--color-tiktok)" />
            <Bar dataKey="otro" stackId="a" fill="var(--color-otro)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
