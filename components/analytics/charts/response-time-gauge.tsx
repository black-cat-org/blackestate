"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartHeader } from "@/components/analytics/chart-header"
import { cn } from "@/lib/utils"

interface ResponseTimeGaugeProps {
  data: {
    average: number
    meta: number
    distribution: { fast: number; medium: number; slow: number }
  }
}

export function ResponseTimeGauge({ data }: ResponseTimeGaugeProps) {
  const onTarget = data.average <= data.meta

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Tiempo de respuesta"
          helpText="Muestra qué tan rápido responden tus leads cuando el bot les envía un mensaje. Un tiempo de respuesta bajo significa que el lead está muy interesado. Si la mayoría tarda más de 30 minutos en responder puede significar que el mensaje inicial del bot no está enganchando lo suficiente."
          subtitle="qué tan rápido responden tus leads al bot"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-bold", onTarget ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400")}>
            {data.average} min
          </span>
          <span className="text-sm text-muted-foreground">promedio</span>
          <span className="text-sm text-muted-foreground">/ Meta: {data.meta} min</span>
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Distribución</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full">
            <div className="bg-green-500" style={{ width: `${data.distribution.fast}%` }} />
            <div className="bg-yellow-500" style={{ width: `${data.distribution.medium}%` }} />
            <div className="bg-red-500" style={{ width: `${data.distribution.slow}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>&lt; 5 min ({data.distribution.fast}%)</span>
            <span>5 - 30 min ({data.distribution.medium}%)</span>
            <span>&gt; 30 min ({data.distribution.slow}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
