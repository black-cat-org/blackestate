"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"

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

export function AppointmentOutcomesDonut({ data }: AppointmentOutcomesDonutProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Resultado de citas"
          helpText="Muestra cómo terminaron todas las citas que el bot agendó en este período. Solicitada significa que el lead pidió la cita pero aún no fue confirmada. Confirmada significa que fue aceptada pero aún no ocurrió. Completada significa que la visita se realizó. Cancelada significa que no se llevó a cabo. Una tasa de completadas alta significa que el bot está agendando citas de calidad con leads realmente interesados."
          subtitle="cómo terminaron las citas que el bot agendó en este período"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Pie>
            <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
              {total}
            </text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
              citas
            </text>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {data.map((entry) => (
            <div key={entry.status} className="flex items-center gap-1.5 text-xs">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium">{entry.count}</span>
              <span className="text-muted-foreground">({entry.percentage}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
