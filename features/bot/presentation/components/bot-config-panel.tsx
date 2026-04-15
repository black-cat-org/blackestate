"use client"

import { useState } from "react"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DAYS_OF_WEEK } from "@/lib/constants/bot"
import { updateBotConfigAction } from "@/features/bot/presentation/actions"
import { toast } from "sonner"
import type { BotConfig } from "@/features/bot/domain/bot.entity"

interface BotConfigPanelProps {
  config: BotConfig
}

export function BotConfigPanel({ config: initialConfig }: BotConfigPanelProps) {
  const [config, setConfig] = useState<BotConfig>(initialConfig)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateBotConfigAction(config)
      toast.success("Configuración guardada")
    } catch {
      toast.error("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  function updateSchedule(day: string, field: string, value: string | boolean) {
    setConfig((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value },
      },
    }))
  }

  function updateNotification(key: keyof BotConfig["notifications"], value: boolean) {
    setConfig((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }))
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Bot status */}
      <Card>
        <CardContent className="p-4!">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`size-3 rounded-full ${config.active ? "bg-green-500" : "bg-red-500"}`} />
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="size-4" />
                  Estado del bot
                </p>
                <p className="text-xs text-muted-foreground">
                  {config.active ? "El bot está respondiendo mensajes automáticamente" : "El bot está pausado"}
                </p>
              </div>
            </div>
            <Switch
              checked={config.active}
              onCheckedChange={(active) => setConfig((prev) => ({ ...prev, active }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Horarios disponibles</h4>
          <p className="text-xs text-muted-foreground">Horarios en los que el bot puede agendar citas</p>
        </div>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => {
            const schedule = config.schedule[day]
            if (!schedule) return null
            return (
              <div key={day} className="flex items-center gap-3">
                <Switch
                  checked={schedule.enabled}
                  onCheckedChange={(enabled) => updateSchedule(day, "enabled", enabled)}
                />
                <span className="w-24 text-sm capitalize">{day}</span>
                {schedule.enabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) => updateSchedule(day, "startTime", e.target.value)}
                      className="h-8 w-28 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) => updateSchedule(day, "endTime", e.target.value)}
                      className="h-8 w-28 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Welcome message */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Mensaje de bienvenida</h4>
          <p className="text-xs text-muted-foreground">
            Variables disponibles: {"{nombre}"}, {"{propiedad}"}, {"{agente}"}
          </p>
        </div>
        <Textarea
          value={config.welcomeMessage}
          onChange={(e) => setConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
          rows={4}
        />
      </div>

      <Separator />

      {/* Appointment settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Duración de citas</Label>
          <Select
            value={String(config.appointmentDuration)}
            onValueChange={(v) => setConfig((prev) => ({ ...prev, appointmentDuration: Number(v) }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="45">45 minutos</SelectItem>
              <SelectItem value="60">60 minutos</SelectItem>
              <SelectItem value="90">90 minutos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Recordatorio antes</Label>
          <Select
            value={String(config.reminderHoursBefore)}
            onValueChange={(v) => setConfig((prev) => ({ ...prev, reminderHoursBefore: Number(v) }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hora antes</SelectItem>
              <SelectItem value="2">2 horas antes</SelectItem>
              <SelectItem value="3">3 horas antes</SelectItem>
              <SelectItem value="24">24 horas antes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Notification preferences */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Preferencias de notificación</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="notif-new"
              checked={config.notifications.newAppointmentRequest}
              onCheckedChange={(checked) => updateNotification("newAppointmentRequest", !!checked)}
            />
            <Label htmlFor="notif-new" className="text-sm font-normal">
              Nueva solicitud de cita
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="notif-confirmed"
              checked={config.notifications.appointmentConfirmed}
              onCheckedChange={(checked) => updateNotification("appointmentConfirmed", !!checked)}
            />
            <Label htmlFor="notif-confirmed" className="text-sm font-normal">
              Cita confirmada
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="notif-reminder"
              checked={config.notifications.reminderBeforeAppointment}
              onCheckedChange={(checked) => updateNotification("reminderBeforeAppointment", !!checked)}
            />
            <Label htmlFor="notif-reminder" className="text-sm font-normal">
              Recordatorio antes de la cita
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="notif-every"
              checked={config.notifications.everyClientMessage}
              onCheckedChange={(checked) => updateNotification("everyClientMessage", !!checked)}
            />
            <Label htmlFor="notif-every" className="text-sm font-normal">
              Cada mensaje del cliente
            </Label>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar configuración"}
      </Button>
    </div>
  )
}
