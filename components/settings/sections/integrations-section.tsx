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
        <p className="text-sm text-muted-foreground">WhatsApp, redes sociales y APIs</p>
      </div>

      {/* WhatsApp */}
      <Card>
        <CardContent className="space-y-3 p-4!">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">WhatsApp</h4>
            <Badge variant={data.whatsappConnected ? "default" : "destructive"}>
              {data.whatsappConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-number">Número de WhatsApp</Label>
            <Input
              id="wa-number"
              value={data.whatsappNumber}
              onChange={(e) => update("whatsappNumber", e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" disabled>
            {data.whatsappConnected ? "Reconectar" : "Conectar"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Social networks */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Redes Sociales</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={data.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              placeholder="@usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={data.facebook}
              onChange={(e) => update("facebook", e.target.value)}
              placeholder="Nombre de página"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* API */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">API</h4>
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
