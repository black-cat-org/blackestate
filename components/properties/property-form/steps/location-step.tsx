"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Locate, MapPin, Link2, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { extractCoordsFromGoogleMapsUrl } from "@/lib/utils/google-maps"
import type { PropertyFormData } from "@/lib/types/property"

export function LocationStep({ form }: { form: UseFormReturn<PropertyFormData> }) {
  const { register, formState: { errors }, setValue, watch } = form
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const lat = watch("lat")
  const lng = watch("lng")
  const hasCoords = lat && lng

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error")
      return
    }
    setGeoStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("lat", String(pos.coords.latitude))
        setValue("lng", String(pos.coords.longitude))
        setGeoStatus("success")
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: true }
    )
  }

  const handleGoogleMapsUrlChange = (url: string) => {
    setValue("googleMapsUrl", url)
    const coords = extractCoordsFromGoogleMapsUrl(url)
    if (coords) {
      setValue("lat", String(coords.lat))
      setValue("lng", String(coords.lng))
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Ubicación</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="country">País *</Label>
          <Input id="country" {...register("country")} placeholder="Argentina" />
          {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
        </div>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Barrio</Label>
          <Input id="neighborhood" {...register("neighborhood")} placeholder="Ej: Palermo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="street">Calle *</Label>
          <Input id="street" {...register("street")} placeholder="Ej: Av. Santa Fe" />
          {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
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

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Ubicación en mapa</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="googleMapsUrl" className="flex items-center gap-1.5">
            <Link2 className="size-3.5" />
            Pegar link de Google Maps
          </Label>
          <Input
            id="googleMapsUrl"
            value={watch("googleMapsUrl")}
            onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
            placeholder="https://maps.google.com/..."
          />
          <p className="text-xs text-muted-foreground">
            Busca la ubicación en Google Maps, copia el link y pegalo acá. Las coordenadas se extraen automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDetectLocation}
          disabled={geoStatus === "loading"}
        >
          <Locate className="mr-2 size-4" />
          {geoStatus === "loading" ? "Detectando..." : "Detectar mi ubicación"}
        </Button>

        {geoStatus === "error" && (
          <p className="text-sm text-destructive">
            No se pudo obtener la ubicación. Verifica los permisos del navegador.
          </p>
        )}

        {hasCoords && (
          <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
            <CheckCircle2 className="size-4 text-green-600" />
            <span className="font-mono text-xs">
              {lat}, {lng}
            </span>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-primary hover:underline"
            >
              Verificar en Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
