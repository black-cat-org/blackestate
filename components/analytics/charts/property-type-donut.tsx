"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const TYPE_COLORS = [
  "hsl(217, 91%, 60%)",   // blue
  "hsl(271, 91%, 65%)",   // purple
  "hsl(142, 71%, 45%)",   // green
  "hsl(45, 93%, 47%)",    // yellow
  "hsl(330, 70%, 50%)",   // pink
  "hsl(30, 90%, 50%)",    // orange
  "hsl(0, 0%, 60%)",      // gray
  "hsl(180, 60%, 45%)",   // teal
]

const chartConfig = {
  count: { label: "Propiedades" },
} satisfies ChartConfig

interface PropertyTypeDonutProps {
  data: { type: string; label: string; count: number; percentage: number }[]
}

export function PropertyTypeDonut({ data }: PropertyTypeDonutProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribución por tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry, i) => (
                <Cell key={entry.type} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {data.map((entry, i) => (
            <div key={entry.type} className="flex items-center gap-1.5 text-xs">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium">{entry.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
