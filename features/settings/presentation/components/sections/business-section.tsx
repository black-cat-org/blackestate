"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { updateBusinessSettingsAction } from "@/features/settings/presentation/actions"
import { toast } from "sonner"
import type { BusinessSettings } from "@/features/settings/domain/settings.entity"

interface BusinessSectionProps {
  data: BusinessSettings
}

export function BusinessSection({ data: initialData }: BusinessSectionProps) {
  const [data, setData] = useState<BusinessSettings>(initialData)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof BusinessSettings>(field: K, value: BusinessSettings[K]) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  function updateCommissionByType(type: keyof BusinessSettings["commissionByType"], value: number) {
    setData((prev) => ({
      ...prev,
      commissionByType: { ...prev.commissionByType, [type]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateBusinessSettingsAction(data)
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
        <h3 className="text-lg font-semibold">Negocio</h3>
        <p className="text-sm text-muted-foreground">Empresa, moneda y comisiones</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company">Nombre de empresa</Label>
          <Input id="company" value={data.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <Select value={data.currency} onValueChange={(v) => update("currency", v)}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD - Dólar estadounidense</SelectItem>
              <SelectItem value="BOB">BOB - Boliviano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="growth">Crecimiento mensual objetivo (%)</Label>
          <Input
            id="growth"
            type="number"
            min={0}
            max={100}
            step={1}
            value={data.monthlyGrowthTarget}
            onChange={(e) => update("monthlyGrowthTarget", Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Se usa para calcular la línea de meta en la gráfica de ingresos</p>
        </div>
      </div>

      <Separator />

      {/* Commissions */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold">Comisiones</h4>
          <p className="text-xs text-muted-foreground">Porcentaje de comisión que cobras por cada tipo de operación</p>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={data.sameCommissionForAll}
            onCheckedChange={(checked) => update("sameCommissionForAll", checked === true)}
          />
          Misma comisión para todas las operaciones
        </label>

        {data.sameCommissionForAll ? (
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="commission">Comisión (%)</Label>
            <Input
              id="commission"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={data.defaultCommissionRate}
              onChange={(e) => update("defaultCommissionRate", Number(e.target.value))}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Venta (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={data.commissionByType.sale}
                onChange={(e) => updateCommissionByType("sale", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Alquiler (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={data.commissionByType.rent}
                onChange={(e) => updateCommissionByType("rent", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Generalmente equivale a 1 mes de alquiler (100%)</p>
            </div>
            <div className="space-y-2">
              <Label>Anticrético (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={data.commissionByType.antichretic}
                onChange={(e) => updateCommissionByType("antichretic", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Alquiler temporal (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={data.commissionByType.short_term}
                onChange={(e) => updateCommissionByType("short_term", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Generalmente equivale a 1 mes de alquiler (100%)</p>
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
