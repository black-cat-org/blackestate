import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Info, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AlertItem } from "@/lib/types/analytics"

const ALERT_ICONS = {
  warning: AlertTriangle,
  info: Info,
  urgent: AlertCircle,
}

const ALERT_COLORS = {
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
  urgent: "text-red-600 dark:text-red-400",
}

interface AlertsPanelProps {
  alerts: AlertItem[]
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay alertas pendientes</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alertas y destacados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = ALERT_ICONS[alert.type]
            return (
              <div key={alert.id} className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-4 shrink-0", ALERT_COLORS[alert.type])} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
