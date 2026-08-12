"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"
import type { FunnelStep } from "@/features/analytics/domain/analytics.entity"

interface ConversionFunnelProps {
  data: FunnelStep[]
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Embudo de conversión"
          helpText="Muestra cuántas consultas y negocios tienes en cada etapa del proceso de venta. Lo ideal es que los números bajen de arriba hacia abajo — muchas consultas abiertas y pocas perdidas significa que estás trabajando bien. Si ves que muchas se estancan en Abierta o Negociación significa que el bot o tú no están logrando avanzarlas."
          subtitle={`así están distribuidos tus ${total} registros en el embudo en este momento`}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((entry) => {
            const widthPct = (entry.value / maxValue) * 100
            const pctOfTotal = total > 0 ? Math.round((entry.value / total) * 100) : 0

            return (
              <div key={entry.label} className="flex items-center gap-3">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="w-24 text-sm shrink-0">{entry.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, backgroundColor: entry.fill }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold">{entry.value}</span>
                <span className="w-10 text-right text-xs text-muted-foreground">{pctOfTotal}%</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
