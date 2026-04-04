"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { FunnelStep } from "@/lib/types/analytics"

const chartConfig = {
  value: { label: "Leads" },
  nuevo: { label: "Nuevo", color: "hsl(217, 91%, 60%)" },
  contactado: { label: "Contactado", color: "hsl(45, 93%, 47%)" },
  interesado: { label: "Interesado", color: "hsl(142, 71%, 45%)" },
  ganado: { label: "Ganado", color: "hsl(142, 71%, 45%)" },
  perdido: { label: "Perdido", color: "hsl(0, 72%, 51%)" },
  descartado: { label: "Descartado", color: "hsl(0, 0%, 60%)" },
} satisfies ChartConfig

interface ConversionFunnelProps {
  data: FunnelStep[]
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Embudo de conversión</CardTitle>
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
