"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { INQUIRY_SOURCE_OTHER_LABEL } from "@/lib/constants/inquiry"

interface InquiriesBySourceChartProps {
  data: { source: string; label: string; count: number }[]
}

const chartConfig = {
  count: {
    label: "Consultas",
  },
  public_form: {
    label: "Form público",
    color: "hsl(200, 70%, 45%)",
  },
  bot: {
    label: "Bot WhatsApp",
    color: "hsl(280, 60%, 50%)",
  },
  manual: {
    label: "Manual",
    color: "hsl(0, 0%, 40%)",
  },
  facebook: {
    label: "Facebook",
    color: "hsl(221, 44%, 41%)",
  },
  instagram: {
    label: "Instagram",
    color: "hsl(330, 70%, 50%)",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "hsl(142, 70%, 40%)",
  },
  tiktok: {
    label: "TikTok",
    color: "hsl(0, 0%, 10%)",
  },
  google: {
    label: "Google",
    color: "hsl(45, 93%, 47%)",
  },
  referral: {
    label: "Referido",
    color: "hsl(260, 50%, 55%)",
  },
  direct: {
    label: "Directo",
    color: "hsl(160, 50%, 40%)",
  },
  other: {
    label: INQUIRY_SOURCE_OTHER_LABEL,
    color: "hsl(0, 0%, 60%)",
  },
} satisfies ChartConfig

export function InquiriesBySourceChart({ data }: InquiriesBySourceChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fill: `var(--color-${d.source})`,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Consultas por fuente</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={80}
              fontSize={12}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
