"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const SOURCE_COLORS: Record<string, string> = {
  facebook: "hsl(221, 44%, 41%)",
  instagram: "hsl(330, 70%, 50%)",
  whatsapp: "hsl(142, 70%, 40%)",
  tiktok: "hsl(0, 0%, 10%)",
  otro: "hsl(0, 0%, 60%)",
}

const chartConfig = {
  count: { label: "Leads" },
  facebook: { label: "Facebook", color: SOURCE_COLORS.facebook },
  instagram: { label: "Instagram", color: SOURCE_COLORS.instagram },
  whatsapp: { label: "WhatsApp", color: SOURCE_COLORS.whatsapp },
  tiktok: { label: "TikTok", color: SOURCE_COLORS.tiktok },
  otro: { label: "Otro", color: SOURCE_COLORS.otro },
} satisfies ChartConfig

interface SourceDonutChartProps {
  data: { source: string; label: string; count: number; percentage: number }[]
}

export function SourceDonutChart({ data }: SourceDonutChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top fuentes de leads</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="source" />} />
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || SOURCE_COLORS.otro} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {data.map((entry) => (
            <div key={entry.source} className="flex items-center gap-1.5 text-xs">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[entry.source] || SOURCE_COLORS.otro }} />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium">{entry.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
