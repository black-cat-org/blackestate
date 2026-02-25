"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ZonePricing } from "@/lib/types/analytics"

const chartConfig = {
  avgPricePerM2: { label: "Precio/m² (USD)", color: "hsl(142, 71%, 45%)" },
} satisfies ChartConfig

interface PricePerM2Props {
  data: ZonePricing[]
}

export function PricePerM2({ data }: PricePerM2Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Precio por m² por zona</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
            <YAxis dataKey="zone" type="category" tickLine={false} axisLine={false} width={100} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="avgPricePerM2" fill="var(--color-avgPricePerM2)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
