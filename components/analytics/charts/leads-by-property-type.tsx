"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/components/analytics/chart-header"

const TYPE_COLORS: Record<string, string> = {
  house: "hsl(217, 91%, 60%)",
  apartment: "hsl(330, 70%, 50%)",
  land: "hsl(142, 70%, 40%)",
  commercial: "hsl(45, 93%, 47%)",
  office: "hsl(271, 91%, 65%)",
  warehouse: "hsl(0, 0%, 45%)",
  cabin: "hsl(25, 80%, 50%)",
  ph: "hsl(190, 70%, 45%)",
}

const chartConfig = {
  count: { label: "Leads" },
} satisfies ChartConfig

interface LeadsByPropertyTypeProps {
  data: { type: string; label: string; count: number }[]
}

export function LeadsByPropertyType({ data }: LeadsByPropertyTypeProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Leads por tipo de propiedad"
          helpText="Muestra qué tipos de propiedad generan más consultas. Si Casa y Departamento concentran la mayoría significa que ahí está la demanda real de tu mercado. Úsalo para decidir en qué tipo de propiedades especializarte."
          subtitle="qué tipos de propiedad generan más interés en este período"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30 }}>
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={100} fontSize={12} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || "hsl(0, 0%, 60%)"} />
              ))}
              <LabelList dataKey="count" position="right" className="fill-foreground text-xs font-medium" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
