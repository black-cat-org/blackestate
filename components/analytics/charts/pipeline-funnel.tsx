"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"
import type { PipelineStage } from "@/lib/types/analytics"

const chartConfig = {
  value: { label: "Ticket promedio (USD)" },
} satisfies ChartConfig

interface PipelineFunnelProps {
  data: PipelineStage[]
}

export function PipelineFunnel({ data }: PipelineFunnelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Ticket promedio por tipo de operación"
          helpText="Muestra cuánto ganas en promedio por cada tipo de operación que cierras. Si las ventas tienen un ticket promedio mucho mayor que los alquileres significa que cada venta te genera más dinero aunque cierres menos. Úsalo para decidir en qué tipo de operación vale más la pena enfocarte."
          subtitle="cuánto ganas en promedio por cada tipo de operación que cierras"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} margin={{ left: 0, top: 20 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `US$ ${Number(value).toLocaleString("es-BO")}`} />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                className="fill-foreground text-[10px] font-medium"
                formatter={(value: number) => `US$ ${(value / 1000).toFixed(1)}K`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="mt-2 flex justify-around text-xs text-muted-foreground">
          {data.map((entry) => (
            <div key={entry.stage} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
