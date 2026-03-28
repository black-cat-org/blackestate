"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Locate, MapPin, Link2, CheckCircle2, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { extractCoordsFromGoogleMapsUrl } from "@/lib/utils/google-maps"
import { reverseGeocode } from "@/lib/utils/reverse-geocode"
import type { PropertyFormData } from "@/lib/types/property"

export function LocationStep({ form }: { form: UseFormReturn<PropertyFormData> }) {
  const { register, formState: { errors }, setValue, watch } = form
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const lat = watch("lat")
  const lng = watch("lng")
  const hasCoords = lat && lng

  const fillAddressFromCoords = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng)
    const values = form.getValues()

    if (address.country && !values.country) setValue("country", address.country)
    if (address.state && !values.state) setValue("state", address.state)
    if (address.city && !values.city) setValue("city", address.city)
    if (address.neighborhood && !values.neighborhood) setValue("neighborhood", address.neighborhood)
    if (address.street && !values.street) setValue("street", address.street)
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error")
      return
    }
    setGeoStatus("loading")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setValue("lat", String(latitude))
        setValue("lng", String(longitude))
        setGeoStatus("success")
        await fillAddressFromCoords(latitude, longitude)
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: true }
    )
  }

  const handleGoogleMapsUrlChange = async (url: string) => {
    setValue("googleMapsUrl", url)
    const coords = extractCoordsFromGoogleMapsUrl(url)
    if (coords) {
      setValue("lat", String(coords.lat))
      setValue("lng", String(coords.lng))
      await fillAddressFromCoords(coords.lat, coords.lng)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Ubicación</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="country">País *</Label>
          <Input id="country" {...register("country")} placeholder="Bolivia" />
          {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad *</Label>
          <Input id="city" {...register("city")} placeholder="Ej: Santa Cruz de la Sierra" />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Provincia *</Label>
          <Input id="state" {...register("state")} placeholder="Ej: Santa Cruz" />
          {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Barrio</Label>
          <Input id="neighborhood" {...register("neighborhood")} placeholder="Ej: Equipetrol" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="street">Calle *</Label>
          <Input id="street" {...register("street")} placeholder="Ej: Av. San Martín" />
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

        <div className="h-px bg-border" />

        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <label htmlFor="hideExactLocation" className="flex cursor-pointer items-start gap-3">
            <Switch
              id="hideExactLocation"
              checked={watch("hideExactLocation")}
              onCheckedChange={(checked) => setValue("hideExactLocation", checked === true)}
              className="mt-0.5 shrink-0"
            />
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
                Ocultar dirección exacta
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Al activarlo, los visitantes verán solo una zona aproximada en el mapa, protegiendo
                la ubicación exacta de la propiedad y evitando tratos directos sin tu intermediación.
                Al desactivarlo, se mostrará la dirección y el punto exacto en el mapa.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
