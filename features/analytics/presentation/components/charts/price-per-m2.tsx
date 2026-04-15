"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"
import type { ZonePricing } from "@/features/analytics/domain/analytics.entity"

const ZONE_COLORS: Record<string, string> = {
  "Equipetrol": "hsl(217, 91%, 60%)",
  "Urubó": "hsl(142, 70%, 40%)",
  "Las Palmas": "hsl(330, 70%, 50%)",
  "Norte": "hsl(271, 91%, 65%)",
  "Plan 3000": "hsl(25, 80%, 50%)",
  "Montero": "hsl(45, 93%, 47%)",
}

const chartConfig = {
  avgPricePerM2: { label: "Precio/m² (USD)" },
} satisfies ChartConfig

interface PricePerM2Props {
  data: ZonePricing[]
}

export function PricePerM2({ data }: PricePerM2Props) {
  const sorted = [...data].filter((d) => d.avgPricePerM2 > 0).sort((a, b) => b.avgPricePerM2 - a.avgPricePerM2)
  const totalProperties = data.reduce((sum, d) => sum + d.count, 0)
  const totalZones = data.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Precio por m² por zona"
          helpText="Muestra cuánto cuesta en promedio cada metro cuadrado en cada zona. A diferencia del precio total, este dato te permite comparar zonas de forma justa sin importar el tamaño de las propiedades. Una zona con precio por m² alto significa que es más exclusiva o con mayor demanda."
          subtitle={`${totalProperties} propiedades en ${totalZones} zonas`}
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 65 }}>
            <YAxis dataKey="zone" type="category" tickLine={false} axisLine={false} width={90} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `US$ ${Number(value).toLocaleString("es-BO")}/m²`} />} />
            <Bar dataKey="avgPricePerM2" radius={4}>
              {sorted.map((entry) => (
                <Cell key={entry.zone} fill={ZONE_COLORS[entry.zone] || "hsl(0, 0%, 60%)"} />
              ))}
              <LabelList
                dataKey="avgPricePerM2"
                position="right"
                className="fill-foreground text-[10px] font-medium"
                formatter={(value: number) => `US$ ${value.toLocaleString("es-BO")}`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
