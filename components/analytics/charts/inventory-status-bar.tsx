"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Estado del inventario</CardTitle>
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
