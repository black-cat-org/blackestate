"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Trophy, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AlertItem } from "@/features/analytics/domain/analytics.entity"

const ALERT_ICONS = {
  warning: AlertTriangle,
  info: AlertTriangle,
  urgent: AlertCircle,
}

const ALERT_COLORS = {
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
  urgent: "text-red-600 dark:text-red-400",
}

interface AlertsPanelProps {
  alerts: AlertItem[]
  highlights: string[]
}

export function AlertsPanel({ alerts, highlights }: AlertsPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleAlerts = expanded ? alerts : alerts.slice(0, 4)
  const hasMore = alerts.length > 4

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alertas y destacados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Requiere tu atención */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requiere tu atención</h4>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todo al día, no hay alertas pendientes.</p>
          ) : (
            <div className="space-y-2">
              {visibleAlerts.map((alert) => {
                const Icon = ALERT_ICONS[alert.type]
                return (
                  <div key={alert.id} className="flex items-start gap-2.5">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", ALERT_COLORS[alert.type])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                    {alert.actionUrl && alert.actionLabel && (
                      <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" asChild>
                        <Link href={alert.actionUrl}>{alert.actionLabel}</Link>
                      </Button>
                    )}
                  </div>
                )
              })}
              {hasMore && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "Ver menos" : `Ver todos (${alerts.length})`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Destacados del período */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Destacados del período</h4>
          {highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay destacados este período, sigue adelante.</p>
          ) : (
            <div className="space-y-2">
              {highlights.map((text, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {i === 0 ? (
                    <Trophy className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                  ) : (
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-purple-500" />
                  )}
                  <p className="text-sm">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
