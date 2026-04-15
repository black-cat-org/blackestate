"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartHeader } from "@/features/analytics/presentation/components/chart-header"

interface InventoryItem {
  status: string
  label: string
  count: number
  percentage: number
  fill: string
}

interface InventoryStatusBarProps {
  data: InventoryItem[]
}

export function InventoryStatusBar({ data }: InventoryStatusBarProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Estado del inventario"
          helpText="Muestra cómo está distribuido tu portafolio de propiedades en este momento. Lo ideal es tener la mayoría en Activa — significa que tienes inventario disponible para tus clientes. Si tienes muchas en Pausada puede ser momento de revisarlas y reactivarlas."
          subtitle={`así está distribuido tu portafolio de ${total} propiedades en este momento`}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-4 overflow-hidden rounded-full">
          {data.filter(d => d.count > 0).map((item) => (
            <div
              key={item.status}
              className="transition-all"
              style={{ width: `${item.percentage}%`, backgroundColor: item.fill }}
              title={`${item.label}: ${item.count}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {data.filter(d => d.count > 0).map((item) => (
            <div key={item.status} className="flex items-center gap-1.5 text-xs">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
