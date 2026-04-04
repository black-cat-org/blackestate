"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"
import type { FunnelStep } from "@/lib/types/analytics"

const chartConfig = {
  value: { label: "Leads" },
  nuevo: { label: "Nuevo", color: "hsl(217, 91%, 60%)" },
  contactado: { label: "Contactado", color: "hsl(45, 93%, 47%)" },
  interesado: { label: "Interesado", color: "hsl(271, 91%, 65%)" },
  ganado: { label: "Ganado", color: "hsl(142, 71%, 45%)" },
  perdido: { label: "Perdido", color: "hsl(0, 72%, 51%)" },
  descartado: { label: "Descartado", color: "hsl(0, 0%, 60%)" },
} satisfies ChartConfig

interface ConversionFunnelProps {
  data: FunnelStep[]
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Embudo de conversión"
          helpText="Muestra cuántos leads tienes en cada etapa del proceso de venta. Lo ideal es que el número vaya bajando de arriba hacia abajo — muchos leads nuevos y pocos perdidos significa que estás trabajando bien. Si ves que muchos se quedan en Nuevo o Contactado significa que el bot o tú no están logrando avanzarlos."
          subtitle={`así están distribuidos tus ${total} leads en este momento`}
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={90} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
              <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-medium" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
