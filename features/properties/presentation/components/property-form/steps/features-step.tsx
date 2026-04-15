"use client"

import { UseFormReturn } from "react-hook-form"
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
import {
  SURFACE_UNIT_LABELS,
  CONDITION_OPTIONS,
  ORIENTATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  AMENITIES_OPTIONS,
} from "@/lib/constants/property"
import type { PropertyFormData } from "@/lib/types/property"

export function FeaturesStep({ form }: { form: UseFormReturn<PropertyFormData> }) {
  const { register, setValue, watch } = form
  const amenities = watch("amenities")

  const toggleAmenity = (value: string) => {
    const current = amenities || []
    setValue(
      "amenities",
      current.includes(value)
        ? current.filter((a) => a !== value)
        : [...current, value]
    )
  }

  return (
    <div className="space-y-8">
      {/* Sección 1: Características de la unidad */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Características del inmueble</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="totalArea">Superficie total</Label>
            <Input id="totalArea" type="number" {...register("totalArea")} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coveredArea">Superficie construida</Label>
            <Input id="coveredArea" type="number" {...register("coveredArea")} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Unidad</Label>
            <Select
              value={watch("surfaceUnit")}
              onValueChange={(v) => setValue("surfaceUnit", v as PropertyFormData["surfaceUnit"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SURFACE_UNIT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Dormitorios</Label>
            <Input id="bedrooms" type="number" {...register("bedrooms")} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bathrooms">Baños</Label>
            <Input id="bathrooms" type="number" {...register("bathrooms")} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="garages">Estacionamiento</Label>
            <Input id="garages" type="number" {...register("garages")} placeholder="0" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="age">Antigüedad (años)</Label>
            <Input id="age" type="number" {...register("age")} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Condición</Label>
            <Select
              value={watch("condition") || ""}
              onValueChange={(v) => setValue("condition", v as PropertyFormData["condition"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Orientación</Label>
            <Select
              value={watch("orientation") || ""}
              onValueChange={(v) => setValue("orientation", v as PropertyFormData["orientation"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {ORIENTATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Sección 2: Equipamiento de la unidad */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Equipamiento del inmueble</h3>
          <p className="text-sm text-muted-foreground">Instalaciones y elementos del inmueble</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EQUIPMENT_OPTIONS.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={amenities?.includes(item.value)}
                onCheckedChange={() => toggleAmenity(item.value)}
              />
              {item.label}
            </label>
          ))}
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Sección 3: Amenidades */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Amenidades</h3>
          <p className="text-sm text-muted-foreground">Espacios y servicios compartidos del edificio o condominio</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AMENITIES_OPTIONS.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={amenities?.includes(item.value)}
                onCheckedChange={() => toggleAmenity(item.value)}
              />
              {item.label}
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
