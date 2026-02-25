"use client"

import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const SOURCE_COLORS: Record<string, string> = {
  facebook: "hsl(221, 44%, 41%)",
  instagram: "hsl(330, 70%, 50%)",
  whatsapp: "hsl(142, 70%, 40%)",
  tiktok: "hsl(0, 0%, 10%)",
  otro: "hsl(0, 0%, 60%)",
}

const chartConfig = {
  amount: { label: "Comisión (USD)" },
} satisfies ChartConfig

interface CommissionsBySourceProps {
  data: { source: string; label: string; amount: number }[]
}

export function CommissionsBySource({ data }: CommissionsBySourceProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comisiones por fuente</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={80} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="amount" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || SOURCE_COLORS.otro} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
