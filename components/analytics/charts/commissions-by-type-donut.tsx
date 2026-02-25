"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const TYPE_COLORS: Record<string, string> = {
  venta: "hsl(142, 71%, 45%)",
  alquiler: "hsl(217, 91%, 60%)",
  temporal: "hsl(271, 91%, 65%)",
}

const chartConfig = {
  amount: { label: "Comisión" },
  venta: { label: "Venta", color: TYPE_COLORS.venta },
  alquiler: { label: "Alquiler", color: TYPE_COLORS.alquiler },
  temporal: { label: "Temporal", color: TYPE_COLORS.temporal },
} satisfies ChartConfig

interface CommissionsByTypeDonutProps {
  data: { type: string; label: string; amount: number; percentage: number }[]
}

export function CommissionsByTypeDonut({ data }: CommissionsByTypeDonutProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comisiones por tipo de operación</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
            <Pie data={data} dataKey="amount" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || "hsl(0, 0%, 60%)"} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {data.map((entry) => (
            <div key={entry.type} className="flex items-center gap-1.5 text-xs">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[entry.type] }} />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium">{entry.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
