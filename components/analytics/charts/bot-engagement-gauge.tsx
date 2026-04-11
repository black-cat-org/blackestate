"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartHeader } from "@/components/analytics/chart-header"

interface BotEngagementGaugeProps {
  data: {
    engagementRate: number
    distribution: { interacted: number; viewedOnly: number; noResponse: number }
  }
}

export function BotEngagementGauge({ data }: BotEngagementGaugeProps) {
  const per10 = Math.round(data.engagementRate / 10)

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title="Engagement del bot"
          helpText="Muestra qué tan bien está funcionando el primer mensaje de tu bot. Interactuaron son los leads que respondieron al menos un mensaje. Solo vieron son los que abrieron el mensaje pero no respondieron. Sin respuesta son los que nunca abrieron el mensaje. Un porcentaje alto de Interactuaron significa que tu bot está haciendo un buen trabajo enganchando a los clientes desde el primer contacto."
          subtitle="qué tan bien engancha tu bot a los leads nuevos"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${data.engagementRate >= 60 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
            {data.engagementRate}%
          </span>
          <span className="text-sm text-muted-foreground">de los leads interactuaron</span>
        </div>
        <p className="text-xs text-muted-foreground italic">{per10} de cada 10 leads que el bot contacta termina respondiendo</p>

        <div>
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Distribución</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full">
            <div className="bg-green-500" style={{ width: `${data.distribution.interacted}%` }} />
            <div className="bg-yellow-500" style={{ width: `${data.distribution.viewedOnly}%` }} />
            <div className="bg-red-500" style={{ width: `${data.distribution.noResponse}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Interactuaron ({data.distribution.interacted}%)</span>
            <span>Solo vieron ({data.distribution.viewedOnly}%)</span>
            <span>Sin respuesta ({data.distribution.noResponse}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
