"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { updateAgentProfile } from "@/lib/data/settings"
import { toast } from "sonner"
import type { AgentProfile } from "@/lib/types/settings"

interface ProfileSectionProps {
  data: AgentProfile
}

export function ProfileSection({ data: initialData }: ProfileSectionProps) {
  const [data, setData] = useState<AgentProfile>(initialData)
  const [saving, setSaving] = useState(false)

  function update(field: keyof AgentProfile, value: string) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateAgentProfile(data)
      toast.success("Configuración guardada")
    } catch {
      toast.error("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  const initials = data.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Perfil</h3>
        <p className="text-sm text-muted-foreground">Información personal y de contacto</p>
      </div>

      {/* Avatar */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4!">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium">{data.name}</p>
            <p className="text-xs text-muted-foreground">{data.email}</p>
            <Button variant="outline" size="sm" className="mt-2" disabled>
              Cambiar foto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Form */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={data.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" value={data.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="license">Número de matrícula</Label>
          <Input id="license" value={data.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" value={data.address} onChange={(e) => update("address", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="website">Sitio web</Label>
          <Input id="website" value={data.website} onChange={(e) => update("website", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={data.bio} onChange={(e) => update("bio", e.target.value)} rows={3} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
