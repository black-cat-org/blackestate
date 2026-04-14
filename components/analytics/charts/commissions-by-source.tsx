"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"

const SOURCE_COLORS: Record<string, string> = {
  facebook: "hsl(221, 44%, 41%)",
  instagram: "hsl(330, 70%, 50%)",
  whatsapp: "hsl(142, 70%, 40%)",
  tiktok: "hsl(0, 0%, 10%)",
  other: "hsl(0, 0%, 60%)",
}

const chartConfig = {
  amount: { label: "Comisión (USD)" },
} satisfies ChartConfig

interface CommissionsBySourceProps {
  data: { source: string; label: string; amount: number }[]
}

export function CommissionsBySource({ data }: CommissionsBySourceProps) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Comisiones por fuente"
          helpText="Muestra cuánto dinero real has ganado en comisiones según de dónde vino cada lead. A diferencia de saber cuántos leads trajo cada canal, este gráfico te dice cuánto dinero real te generó cada uno. Un canal con pocos leads pero mucho dinero es más valioso que uno con muchos leads pero pocas ventas."
          subtitle="cuánto dinero real te generó cada canal en comisiones cobradas"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 65 }}>
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={80} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `US$ ${Number(value).toLocaleString("es-BO")}`} />} />
            <Bar dataKey="amount" radius={4}>
              {sorted.map((entry) => (
                <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || SOURCE_COLORS.other} />
              ))}
              <LabelList
                dataKey="amount"
                position="right"
                className="fill-foreground text-[10px] font-medium"
                formatter={(value: number) => `US$ ${(value / 1000).toFixed(1)}K`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
