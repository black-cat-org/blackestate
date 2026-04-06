"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateBusinessSettings } from "@/lib/data/settings"
import { toast } from "sonner"
import type { BusinessSettings } from "@/lib/types/settings"

interface BusinessSectionProps {
  data: BusinessSettings
}

export function BusinessSection({ data: initialData }: BusinessSectionProps) {
  const [data, setData] = useState<BusinessSettings>(initialData)
  const [saving, setSaving] = useState(false)

  function update<K extends keyof BusinessSettings>(field: K, value: BusinessSettings[K]) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateBusinessSettings(data)
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
        <p className="text-sm text-muted-foreground">Comisiones, moneda y datos fiscales</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="company">Nombre de empresa</Label>
          <Input id="company" value={data.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commission">Comisión por defecto (%)</Label>
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
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <Select value={data.currency} onValueChange={(v) => update("currency", v)}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD - Dólar estadounidense</SelectItem>
              <SelectItem value="ARS">ARS - Peso argentino</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax">Tasa impositiva (%)</Label>
          <Input
            id="tax"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={data.taxRate}
            onChange={(e) => update("taxRate", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fiscal">CUIT / RFC / NIT</Label>
          <Input id="fiscal" value={data.fiscalId} onChange={(e) => update("fiscalId", e.target.value)} />
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="operation-type">Tipo de operación por defecto</Label>
          <Select value={data.defaultOperationType} onValueChange={(v) => update("defaultOperationType", v)}>
            <SelectTrigger id="operation-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="venta">Venta</SelectItem>
              <SelectItem value="alquiler">Alquiler</SelectItem>
              <SelectItem value="temporal">Alquiler temporal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
