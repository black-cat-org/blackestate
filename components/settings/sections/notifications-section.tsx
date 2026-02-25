"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { updateNotificationPreferences } from "@/lib/data/settings"
import { toast } from "sonner"
import type { NotificationPreferences } from "@/lib/types/settings"

interface NotificationsSectionProps {
  data: NotificationPreferences
}

const CHANNEL_LABELS = {
  email: "Email",
  whatsapp: "WhatsApp",
  push: "Notificaciones push",
} as const

const EVENT_LABELS = {
  newLead: "Nuevo lead registrado",
  appointmentCreated: "Cita creada",
  appointmentReminder: "Recordatorio de cita",
  propertySold: "Propiedad vendida",
  weeklyReport: "Reporte semanal",
} as const

export function NotificationsSection({ data: initialData }: NotificationsSectionProps) {
  const [data, setData] = useState<NotificationPreferences>(initialData)
  const [saving, setSaving] = useState(false)

  function updateChannel(key: keyof NotificationPreferences["channels"], value: boolean) {
    setData((prev) => ({ ...prev, channels: { ...prev.channels, [key]: value } }))
  }

  function updateEvent(key: keyof NotificationPreferences["events"], value: boolean) {
    setData((prev) => ({ ...prev, events: { ...prev.events, [key]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateNotificationPreferences(data)
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
        <h3 className="text-lg font-semibold">Notificaciones</h3>
        <p className="text-sm text-muted-foreground">Canales, eventos y horarios</p>
      </div>

      {/* Channels */}
      <Card>
        <CardContent className="space-y-4 p-4!">
          <h4 className="text-sm font-semibold">Canales</h4>
          {(Object.keys(CHANNEL_LABELS) as (keyof typeof CHANNEL_LABELS)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`channel-${key}`} className="font-normal">
                {CHANNEL_LABELS[key]}
              </Label>
              <Switch
                id={`channel-${key}`}
                checked={data.channels[key]}
                onCheckedChange={(checked) => updateChannel(key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Events */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Eventos</h4>
        <div className="space-y-3">
          {(Object.keys(EVENT_LABELS) as (keyof typeof EVENT_LABELS)[]).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`event-${key}`}
                checked={data.events[key]}
                onCheckedChange={(checked) => updateEvent(key, !!checked)}
              />
              <Label htmlFor={`event-${key}`} className="font-normal">
                {EVENT_LABELS[key]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Quiet hours */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Horario silencioso</h4>
            <p className="text-xs text-muted-foreground">No enviar notificaciones durante este horario</p>
          </div>
          <Switch
            checked={data.quietHoursEnabled}
            onCheckedChange={(enabled) => setData((prev) => ({ ...prev, quietHoursEnabled: enabled }))}
          />
        </div>
        {data.quietHoursEnabled && (
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="time"
                value={data.quietHoursStart}
                onChange={(e) => setData((prev) => ({ ...prev, quietHoursStart: e.target.value }))}
                className="h-8 w-28 text-xs"
              />
            </div>
            <span className="mt-5 text-xs text-muted-foreground">a</span>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="time"
                value={data.quietHoursEnd}
                onChange={(e) => setData((prev) => ({ ...prev, quietHoursEnd: e.target.value }))}
                className="h-8 w-28 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
