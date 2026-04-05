"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"

const TYPE_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(271, 91%, 65%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(330, 70%, 50%)",
  "hsl(30, 90%, 50%)",
  "hsl(0, 0%, 60%)",
  "hsl(180, 60%, 45%)",
]

const chartConfig = {
  count: { label: "Propiedades" },
} satisfies ChartConfig

interface PropertyTypeDonutProps {
  data: { type: string; label: string; count: number; percentage: number }[]
}

export function PropertyTypeDonut({ data }: PropertyTypeDonutProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Distribución por tipo"
          helpText="Muestra cómo está distribuido tu portafolio por tipo de propiedad. Si la mayoría son casas significa que te estás especializando en ese segmento. Úsalo para entender en qué tipos de propiedad tienes más inventario y si eso coincide con lo que más te piden tus clientes."
          subtitle="en qué tipos de propiedad está concentrado tu portafolio"
        />
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
            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
              {total}
            </text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
              propiedades
            </text>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {data.map((entry, i) => (
            <div key={entry.type} className="flex items-center gap-1.5 text-xs">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
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
