"use client"

import { useState } from "react"
import { Mail, MessageCircle, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { updateNotificationPreferences } from "@/lib/data/settings"
import { toast } from "sonner"
import type { NotificationPreferences, NotificationChannel } from "@/lib/types/settings"

interface NotificationsSectionProps {
  data: NotificationPreferences
}

const CHANNEL_CONFIG: { key: NotificationChannel; label: string; icon: React.ElementType }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "push", label: "Push", icon: Bell },
]

export function NotificationsSection({ data: initialData }: NotificationsSectionProps) {
  const [data, setData] = useState<NotificationPreferences>(initialData)
  const [saving, setSaving] = useState(false)

  function toggleChannel(eventIndex: number, channel: NotificationChannel) {
    setData((prev) => {
      const events = [...prev.events]
      events[eventIndex] = {
        ...events[eventIndex],
        channels: {
          ...events[eventIndex].channels,
          [channel]: !events[eventIndex].channels[channel],
        },
      }
      return { ...prev, events }
    })
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
        <p className="text-sm text-muted-foreground">Elige qué notificaciones recibir y por qué canal</p>
      </div>

      {/* Event × Channel grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-3 text-left font-medium text-muted-foreground">Evento</th>
              {CHANNEL_CONFIG.map(({ key, label, icon: Icon }) => (
                <th key={key} className="pb-3 text-center font-medium text-muted-foreground w-20">
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="size-4" />
                    <span className="text-xs">{label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.events.map((event, i) => (
              <tr key={event.id} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </td>
                {CHANNEL_CONFIG.map(({ key }) => (
                  <td key={key} className="py-3 text-center">
                    <Checkbox
                      checked={event.channels[key]}
                      onCheckedChange={() => toggleChannel(i, key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
