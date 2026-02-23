"use client"

import { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PropertyFormData } from "@/lib/types/property"

export function LocationStep({ form }: { form: UseFormReturn<PropertyFormData> }) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Ubicación</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="street">Calle *</Label>
          <Input id="street" {...register("street")} placeholder="Ej: Av. Santa Fe" />
          {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="number">Número *</Label>
          <Input id="number" {...register("number")} placeholder="Ej: 1234" />
          {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="floor">Piso</Label>
          <Input id="floor" {...register("floor")} placeholder="Ej: 8" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apartment">Departamento</Label>
          <Input id="apartment" {...register("apartment")} placeholder="Ej: A" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad *</Label>
          <Input id="city" {...register("city")} placeholder="Ej: Buenos Aires" />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Provincia *</Label>
          <Input id="state" {...register("state")} placeholder="Ej: CABA" />
          {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">País *</Label>
          <Input id="country" {...register("country")} placeholder="Argentina" />
          {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Barrio</Label>
          <Input id="neighborhood" {...register("neighborhood")} placeholder="Ej: Palermo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">Código postal</Label>
          <Input id="zipCode" {...register("zipCode")} placeholder="Ej: C1414" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lat">Latitud</Label>
          <Input id="lat" {...register("lat")} placeholder="Ej: -34.5875" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitud</Label>
          <Input id="lng" {...register("lng")} placeholder="Ej: -58.4262" />
        </div>
      </div>
    </div>
  )
}
