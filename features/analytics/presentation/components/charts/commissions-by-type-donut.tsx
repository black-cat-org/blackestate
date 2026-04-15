"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"

const TYPE_COLORS: Record<string, string> = {
  sale: "hsl(217, 91%, 60%)",
  rent: "hsl(142, 71%, 45%)",
  antichretic: "hsl(45, 93%, 47%)",
  short_term: "hsl(271, 91%, 65%)",
}

const chartConfig = {
  amount: { label: "Comisión" },
  sale: { label: "Venta", color: TYPE_COLORS.sale },
  rent: { label: "Alquiler", color: TYPE_COLORS.rent },
  antichretic: { label: "Anticrético", color: TYPE_COLORS.antichretic },
  short_term: { label: "Temporal", color: TYPE_COLORS.short_term },
} satisfies ChartConfig

interface CommissionsByTypeDonutProps {
  data: { type: string; label: string; amount: number; percentage: number }[]
}

export function CommissionsByTypeDonut({ data }: CommissionsByTypeDonutProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Comisiones por tipo de operación"
          helpText="Muestra cómo se distribuyen tus comisiones cobradas según el tipo de operación. Si la mayoría viene de ventas significa que tu negocio depende de cerrar compraventas. Si tienes un porcentaje significativo en alquileres significa que tienes ingresos más recurrentes y estables."
          subtitle="cómo se distribuyen tus comisiones según el tipo de operación"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="type" formatter={(value) => `US$ ${Number(value).toLocaleString("es-BO")}`} />} />
            <Pie data={data} dataKey="amount" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || "hsl(0, 0%, 60%)"} />
              ))}
            </Pie>
            <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">
              US$ {(total / 1000).toFixed(0)}K
            </text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
              cobrado
            </text>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {data.map((entry) => (
            <div key={entry.type} className="flex items-center gap-1.5 text-xs">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[entry.type] || "hsl(0, 0%, 60%)" }} />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium">US$ {(entry.amount / 1000).toFixed(1)}K</span>
              <span className="text-muted-foreground">({entry.percentage}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
