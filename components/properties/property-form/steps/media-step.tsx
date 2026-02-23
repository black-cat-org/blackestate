"use client"

import { UseFormReturn } from "react-hook-form"
import { ImagePlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PropertyFormData } from "@/lib/types/property"

export function MediaStep({ form }: { form: UseFormReturn<PropertyFormData> }) {
  const { register } = form

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Media</h2>

      <div className="space-y-2">
        <Label>Fotos</Label>
        <div className="border-dashed border-2 rounded-lg p-8 flex flex-col items-center justify-center gap-2 text-center">
          <ImagePlus className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arrastra fotos aquí o haz click para seleccionar
          </p>
          <p className="text-xs text-muted-foreground">
            (La subida de archivos se habilitará con el backend)
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="videoUrl">URL del video</Label>
          <Input
            id="videoUrl"
            {...register("videoUrl")}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="virtualTourUrl">URL del tour virtual</Label>
          <Input
            id="virtualTourUrl"
            {...register("virtualTourUrl")}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Planos</Label>
        <div className="border-dashed border-2 rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            Subir planos (disponible con backend)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Documentos legales</Label>
        <div className="border-dashed border-2 rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            Subir documentos (disponible con backend)
          </p>
        </div>
      </div>
    </div>
  )
}
