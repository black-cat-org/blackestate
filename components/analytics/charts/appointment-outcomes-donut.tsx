"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  count: { label: "Citas" },
} satisfies ChartConfig

interface AppointmentOutcomesDonutProps {
  data: {
    status: string
    label: string
    count: number
    percentage: number
    fill: string
  }[]
}

export function AppointmentOutcomesDonut({
  data,
}: AppointmentOutcomesDonutProps) {
  const completed = data.find((d) => d.status === "completada")
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const completionRate =
    total > 0 ? Math.round(((completed?.count ?? 0) / total) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resultado de citas</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto h-[200px] w-full"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="status" />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap justify-center gap-3">
            {data.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center gap-1.5 text-xs"
              >
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-muted-foreground">{entry.label}</span>
                <span className="font-medium">{entry.count}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Tasa de completadas:{" "}
            <span className="font-semibold text-foreground">
              {completionRate}%
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
