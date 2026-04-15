"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { PlanInfo } from "@/features/settings/domain/settings.entity"

interface PlanSectionProps {
  data: PlanInfo
}

const TIER_COLORS: Record<PlanInfo["tier"], string> = {
  free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pro: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  enterprise: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
}

const TIER_LABELS: Record<PlanInfo["tier"], string> = {
  free: "Gratuito",
  pro: "Pro",
  enterprise: "Enterprise",
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = Math.min((used / limit) * 100, 100)
  const isHigh = percentage >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? "bg-orange-500" : "bg-primary"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function PlanSection({ data }: PlanSectionProps) {
  const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
  const [year, month, day] = data.renewalDate.split("-")
  const renewalDate = `${parseInt(day)} de ${MONTHS[parseInt(month) - 1]} de ${year}`

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Plan y Facturación</h3>
        <p className="text-sm text-muted-foreground">Tu plan actual y uso</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardContent className="p-4!">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="text-lg font-semibold">Plan {data.name}</h4>
              <Badge className={TIER_COLORS[data.tier]}>{TIER_LABELS[data.tier]}</Badge>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${data.price}</p>
              <p className="text-xs text-muted-foreground">/ mes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Usage */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Uso actual</h4>
        <UsageBar label="Leads" used={data.leadsUsed} limit={data.leadsLimit} />
        <UsageBar label="Propiedades" used={data.propertiesUsed} limit={data.propertiesLimit} />
        <UsageBar label="Mensajes del bot" used={data.botMessagesUsed} limit={data.botMessagesLimit} />
      </div>

      <Separator />

      {/* Renewal */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Próxima renovación</h4>
          <p className="text-sm text-muted-foreground">{renewalDate}</p>
        </div>
        <Button variant="outline" disabled>
          Actualizar plan
        </Button>
      </div>
    </div>
  )
}
