"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"
import type { BotFunnelStep } from "@/features/analytics/domain/analytics.entity"

const chartConfig = {
  value: { label: "Leads" },
} satisfies ChartConfig

interface BotFunnelProps {
  data: BotFunnelStep[]
  title?: string
  helpText?: string
  subtitleTemplate?: string
}

export function BotFunnel({
  data,
  title = "Efectividad del bot",
  helpText = "Muestra qué tan efectivo es tu bot en cada paso del proceso. De cada 100 leads que se registran, cuántos vieron una propiedad, cuántos solicitaron una cita y cuántos la completaron. Si ves que muchos leads ven propiedades pero pocos solicitan cita puede significar que el bot está enviando propiedades que no coinciden con lo que busca el cliente.",
  subtitleTemplate,
}: BotFunnelProps) {
  const first = data[0]?.value || 1
  const last = data[data.length - 1]?.value || 0
  const overallRate = Math.round((last / first) * 100)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title={title}
          helpText={helpText}
          subtitle={subtitleTemplate || `de cada 100 leads registrados, ${overallRate} terminan en una cita completada`}
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={data} margin={{ left: 0, top: 20 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={0} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                className="fill-foreground text-[10px] font-medium"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="mt-2 flex justify-around text-xs text-muted-foreground">
          {data.map((entry, i) => (
            <span key={entry.label}>{i === 0 ? "100%" : `${entry.percentage}%`}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
