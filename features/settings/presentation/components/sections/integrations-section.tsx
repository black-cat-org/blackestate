"use client"

import { useState } from "react"
import { MessageCircle, Facebook, Instagram, CalendarDays, Megaphone, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { updateIntegrationSettingsAction } from "@/features/settings/presentation/actions"
import { toast } from "sonner"
import type { IntegrationSettings } from "@/features/settings/domain/settings.entity"

interface IntegrationsSectionProps {
  data: IntegrationSettings
}

const UPCOMING_INTEGRATIONS = [
  { icon: Facebook, name: "Facebook Ads", description: "Publica propiedades y crea campañas directamente desde Black Estate" },
  { icon: Instagram, name: "Instagram Business", description: "Publica historias y posts de tus propiedades automáticamente" },
  { icon: CalendarDays, name: "Google Calendar", description: "Sincroniza tus citas con tu calendario de Google" },
  { icon: Megaphone, name: "TikTok Business", description: "Crea y publica videos cortos de tus propiedades" },
  { icon: Building2, name: "Portales inmobiliarios", description: "Publica tus propiedades en InFinca, OLX y otros portales" },
]

export function IntegrationsSection({ data: initialData }: IntegrationsSectionProps) {
  const [data, setData] = useState<IntegrationSettings>(initialData)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateIntegrationSettingsAction(data)
      toast.success("Configuración guardada")
    } catch {
      toast.error("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Integraciones</h3>
        <p className="text-sm text-muted-foreground">Conexiones con servicios externos</p>
      </div>

      {/* WhatsApp Business API */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4!">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950/30">
            <MessageCircle className="size-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold">WhatsApp Business API</h4>
            <p className="text-xs text-muted-foreground">Permite al bot enviar y recibir mensajes automáticamente por WhatsApp</p>
          </div>
          {data.whatsappConnected ? (
            <Badge className="shrink-0 border-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Conectado
            </Badge>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Conectar
            </Button>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Upcoming integrations */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold">Próximamente</h4>
          <p className="text-xs text-muted-foreground">Integraciones en las que estamos trabajando</p>
        </div>
        <div className="space-y-2">
          {UPCOMING_INTEGRATIONS.map((integration) => (
            <Card key={integration.name} className="opacity-60">
              <CardContent className="flex items-center gap-4 p-3!">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <integration.icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{integration.name}</h4>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">Próximamente</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
