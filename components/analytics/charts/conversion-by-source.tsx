"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"
import type { SourceMetric } from "@/lib/types/analytics"

const SOURCE_COLORS: Record<string, string> = {
  facebook: "hsl(221, 44%, 41%)",
  instagram: "hsl(330, 70%, 50%)",
  whatsapp: "hsl(142, 70%, 40%)",
  tiktok: "hsl(0, 0%, 10%)",
  otro: "hsl(0, 0%, 60%)",
}

const chartConfig = {
  conversionRate: { label: "Conversión" },
} satisfies ChartConfig

interface ConversionBySourceProps {
  data: SourceMetric[]
}

export function ConversionBySource({ data }: ConversionBySourceProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Conversión por fuente"
          helpText="Muestra qué canal te trae los leads que realmente compran o alquilan. Por ejemplo si Instagram tiene 50% significa que 1 de cada 2 leads de Instagram termina en venta. Úsalo para saber dónde están tus mejores clientes."
          subtitle="qué canal te trae los clientes que realmente cierran"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 45 }}>
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={80} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
            />
            <Bar dataKey="conversionRate" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || SOURCE_COLORS.otro} />
              ))}
              <LabelList
                dataKey="conversionRate"
                position="right"
                className="fill-foreground text-xs font-medium"
                formatter={(value: number) => `${value}%`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
