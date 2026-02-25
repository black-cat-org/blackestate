"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ZonePricing } from "@/lib/types/analytics"

const chartConfig = {
  avgPrice: { label: "Precio promedio (USD)", color: "hsl(217, 91%, 60%)" },
} satisfies ChartConfig

interface PriceByZoneProps {
  data: ZonePricing[]
}

export function PriceByZone({ data }: PriceByZoneProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Precio promedio por zona</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
            <YAxis dataKey="zone" type="category" tickLine={false} axisLine={false} width={100} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="avgPrice" fill="var(--color-avgPrice)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
