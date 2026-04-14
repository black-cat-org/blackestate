"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartHeader } from "@/components/analytics/chart-header"
import type { SourceMetric } from "@/lib/types/analytics"

const SOURCE_COLORS: Record<string, string> = {
  facebook: "hsl(221, 44%, 41%)",
  instagram: "hsl(330, 70%, 50%)",
  whatsapp: "hsl(142, 70%, 40%)",
  tiktok: "hsl(0, 0%, 10%)",
  other: "hsl(0, 0%, 60%)",
}

interface ConversionBySourceProps {
  data: SourceMetric[]
}

export function ConversionBySource({ data }: ConversionBySourceProps) {
  const maxRate = Math.max(...data.map((d) => d.conversionRate), 1)
  const sorted = [...data].sort((a, b) => b.conversionRate - a.conversionRate)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Conversión por fuente"
          helpText="Muestra qué canal te trae los leads que realmente compran o alquilan. Por ejemplo si Instagram tiene 50% significa que 1 de cada 2 leads de Instagram termina en venta. Úsalo para saber dónde están tus mejores clientes."
          subtitle="qué canal te trae los clientes que realmente cierran"
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sorted.map((entry, i) => {
            const color = SOURCE_COLORS[entry.source] || SOURCE_COLORS.other
            const widthPct = (entry.conversionRate / maxRate) * 100

            return (
              <div key={entry.source} className="flex items-center gap-3">
                <span className="w-5 text-xs font-medium text-muted-foreground text-right">{i + 1}</span>
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="w-20 text-sm shrink-0">{entry.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, backgroundColor: color }} />
                </div>
                <span className="w-12 text-right text-sm font-semibold">{entry.conversionRate}%</span>
                <span className="w-16 text-right text-xs text-muted-foreground">{entry.count} leads</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
