"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  count: { label: "Leads", color: "hsl(271, 91%, 65%)" },
} satisfies ChartConfig

interface LeadsByPropertyTypeProps {
  data: { type: string; label: string; count: number }[]
}

export function LeadsByPropertyType({ data }: LeadsByPropertyTypeProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leads por tipo de propiedad</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={100} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
