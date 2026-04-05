"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"
import type { ZonePricing } from "@/lib/types/analytics"

const ZONE_COLORS: Record<string, string> = {
  "Equipetrol": "hsl(217, 91%, 60%)",
  "Urubó": "hsl(142, 70%, 40%)",
  "Las Palmas": "hsl(330, 70%, 50%)",
  "Norte": "hsl(271, 91%, 65%)",
  "Plan 3000": "hsl(25, 80%, 50%)",
  "Montero": "hsl(45, 93%, 47%)",
}

const chartConfig = {
  avgPrice: { label: "Precio promedio (USD)" },
} satisfies ChartConfig

interface PriceByZoneProps {
  data: ZonePricing[]
}

export function PriceByZone({ data }: PriceByZoneProps) {
  const sorted = [...data].sort((a, b) => b.avgPrice - a.avgPrice)
  const totalProperties = data.reduce((sum, d) => sum + d.count, 0)
  const totalZones = data.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Precio promedio por zona"
          helpText="Muestra el precio promedio de tus propiedades agrupadas por zona. Te ayuda a entender en qué zonas están tus propiedades más caras y en cuáles más accesibles. Útil para saber en qué segmento de mercado estás operando por zona."
          subtitle={`${totalProperties} propiedades en ${totalZones} zonas`}
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 70 }}>
            <YAxis dataKey="zone" type="category" tickLine={false} axisLine={false} width={90} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `US$ ${Number(value).toLocaleString("es-BO")}`} />} />
            <Bar dataKey="avgPrice" radius={4}>
              {sorted.map((entry) => (
                <Cell key={entry.zone} fill={ZONE_COLORS[entry.zone] || "hsl(0, 0%, 60%)"} />
              ))}
              <LabelList
                dataKey="avgPrice"
                position="right"
                className="fill-foreground text-[10px] font-medium"
                formatter={(value: number) => `US$ ${(value / 1000).toFixed(0)}K`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
