"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChartHeader } from "@/components/analytics/chart-header"
import type { HeatmapCell } from "@/lib/types/analytics"

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8-20

interface EngagementHeatmapProps {
  data: HeatmapCell[]
  title?: string
  helpText?: string
  subtitle?: string
}

export function EngagementHeatmap({
  data,
  title = "Horarios de mayor engagement",
  helpText = "Muestra en qué días y horarios tus leads responden más al bot. Los cuadros más oscuros significan más respuestas en ese horario. Úsalo para saber cuándo enviar tus mensajes manuales o para entender cuándo están más activos tus clientes. Si ves que los martes a las 12h hay mucha actividad significa que ese es un buen momento para contactar leads nuevos.",
  subtitle = "en qué días y horarios responden más tus leads",
}: EngagementHeatmapProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  const getValue = (day: number, hour: number) => {
    return data.find((d) => d.day === day && d.hour === hour)?.value ?? 0
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <ChartHeader
          title={title}
          helpText={helpText}
          subtitle={subtitle}
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[400px]"
            style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}
          >
            {/* Header row */}
            <div />
            {DAYS.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-xs text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Data rows */}
            {HOURS.map((hour) => (
              <div key={`row-${hour}`} className="contents">
                <div className="flex items-center justify-end pr-2 text-xs text-muted-foreground">
                  {hour}h
                </div>
                {DAYS.map((_, dayIndex) => {
                  const value = getValue(dayIndex, hour)
                  const intensity = value / maxValue
                  return (
                    <div key={`${dayIndex}-${hour}`} className="p-0.5">
                      <div
                        className="h-6 w-full rounded-sm"
                        style={{
                          backgroundColor: "hsl(271, 91%, 65%)",
                          opacity: Math.max(0.08, intensity),
                        }}
                        title={`${DAYS[dayIndex]} ${hour}:00 — ${value} interacciones`}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <span>Menos</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((opacity) => (
            <div
              key={opacity}
              className="size-3 rounded-sm"
              style={{
                backgroundColor: "hsl(271, 91%, 65%)",
                opacity,
              }}
            />
          ))}
          <span>Mas</span>
        </div>
      </CardContent>
    </Card>
  )
}
