"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

interface LeadsByPropertyTypeProps {
  data: { type: string; label: string; count: number }[]
}

export function LeadsByPropertyType({ data }: LeadsByPropertyTypeProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const sorted = [...data].filter((d) => d.count > 0).sort((a, b) => b.count - a.count)

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <ChartHeader title="Leads por tipo de propiedad" subtitle="sin datos en este período" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">No hay leads en este período.</p>
        </CardContent>
      </Card>
    )
  }

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
        <div className="flex flex-wrap gap-1.5" style={{ minHeight: 180 }}>
          {sorted.map((item) => {
            const pct = (item.count / total) * 100
            const color = TYPE_COLORS[item.type] || "hsl(0, 0%, 60%)"

            return (
              <div
                key={item.type}
                className="relative flex flex-col items-center justify-center rounded-lg text-white overflow-hidden"
                style={{
                  backgroundColor: color,
                  flexGrow: item.count,
                  flexBasis: `${Math.max(pct, 15)}%`,
                  minWidth: 80,
                  minHeight: 70,
                }}
              >
                <span className="text-lg font-bold">{item.count}</span>
                <span className="text-[11px] font-medium opacity-90">{item.label}</span>
                <span className="text-[9px] opacity-70">{Math.round(pct)}%</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
