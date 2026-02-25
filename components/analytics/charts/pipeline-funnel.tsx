"use client"

import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { PipelineStage } from "@/lib/types/analytics"

const chartConfig = {
  value: { label: "Valor (USD)" },
} satisfies ChartConfig

interface PipelineFunnelProps {
  data: PipelineStage[]
}

export function PipelineFunnel({ data }: PipelineFunnelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipeline por etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={data} margin={{ left: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="mt-2 flex justify-around text-xs text-muted-foreground">
          {data.map((entry) => (
            <span key={entry.stage}>{entry.probability}% prob.</span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
