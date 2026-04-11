"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { updateIntegrationSettings } from "@/lib/data/settings"
import { toast } from "sonner"
import type { IntegrationSettings } from "@/lib/types/settings"

interface IntegrationsSectionProps {
  data: IntegrationSettings
}

export function IntegrationsSection({ data: initialData }: IntegrationsSectionProps) {
  const [data, setData] = useState<IntegrationSettings>(initialData)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof IntegrationSettings>(field: K, value: IntegrationSettings[K]) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateIntegrationSettings(data)
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
        <p className="text-sm text-muted-foreground">Conexiones técnicas con servicios externos</p>
      </div>

      {/* WhatsApp Business API */}
      <Card>
        <CardContent className="space-y-3 p-4!">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">WhatsApp Business API</h4>
              <p className="text-xs text-muted-foreground">Conexión del bot con WhatsApp para enviar y recibir mensajes automáticamente</p>
            </div>
            <Badge variant={data.whatsappConnected ? "default" : "destructive"}>
              {data.whatsappConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          <Button variant="outline" size="sm" disabled>
            {data.whatsappConnected ? "Reconectar" : "Conectar"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* API Keys */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">API Keys</h4>
          <p className="text-xs text-muted-foreground">Claves de acceso para servicios externos</p>
        </div>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="gmaps">Google Maps API Key</Label>
            <Input
              id="gmaps"
              type="password"
              value={data.googleMapsApiKey}
              onChange={(e) => update("googleMapsApiKey", e.target.value)}
              placeholder="AIza..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook URL</Label>
            <Input
              id="webhook"
              value={data.webhookUrl}
              onChange={(e) => update("webhookUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
