"use client"

import { useMemo } from "react"
import { Bar, Line, ComposedChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"
import type { TimeSeriesPoint } from "@/lib/types/analytics"

const GREEN = "hsl(142, 71%, 45%)"
const RED = "hsl(0, 72%, 51%)"
const GRAY = "hsl(0, 0%, 60%)"

const chartConfig = {
  ingreso: { label: "Ingresos", color: GREEN },
  meta: { label: "Meta", color: GRAY },
} satisfies ChartConfig

interface RevenueByMonthProps {
  data: TimeSeriesPoint[]
}

export function RevenueByMonth({ data }: RevenueByMonthProps) {
  const barColors = useMemo(() => {
    return data.map((entry, i) => {
      const prev = i > 0 ? Number(data[i - 1].ingreso) : 0
      const current = Number(entry.ingreso)
      return i === 0 || current >= prev ? GREEN : RED
    })
  }, [data])

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Ingresos por mes"
          helpText="Muestra cuánto ganaste en comisiones cada mes. Los meses en verde son los que superaron al mes anterior, los rojos son los que bajaron. La línea punteada es tu meta de crecimiento — por defecto es 10% más que el mes anterior y puedes ajustarlo en Configuración."
          subtitle="tus ingresos mensuales vs tu meta de crecimiento"
        />
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green-500" />Creció vs mes anterior</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" />Bajó vs mes anterior</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-dashed border-t-2 border-gray-400" />Meta</span>
        </div>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ComposedChart data={data} margin={{ left: 0, top: 20 }}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <p className="text-xs font-medium mb-1">{label}</p>
                    {payload.map((entry) => {
                      const idx = data.findIndex((d) => d.date === label)
                      const color = entry.dataKey === "ingreso" ? barColors[idx] || GREEN : GRAY
                      return (
                        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
                          <span className="size-2.5 shrink-0" style={{ backgroundColor: color, borderRadius: '2px' }} />
                          <span className="text-muted-foreground">{entry.dataKey === "ingreso" ? "Ingresos" : "Meta"}</span>
                          <span className="ml-auto font-medium">US$ {Number(entry.value).toLocaleString("es-BO")}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              }}
            />
            <Bar dataKey="ingreso" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={barColors[i]} />
              ))}
              <LabelList
                dataKey="ingreso"
                position="top"
                className="fill-foreground text-[10px] font-medium"
                formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`}
              />
            </Bar>
            <Line
              type="monotone"
              dataKey="meta"
              stroke="var(--color-meta)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, fill: GRAY, stroke: "var(--background)", strokeWidth: 2 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
