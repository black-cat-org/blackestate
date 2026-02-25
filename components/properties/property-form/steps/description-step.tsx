"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Loader2, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { generateDescriptionFromFormData, generateShortDescriptionFromFormData } from "@/lib/services/ai-mock"
import { toast } from "sonner"
import type { PropertyFormData } from "@/lib/types/property"

export function DescriptionStep({ form }: { form: UseFormReturn<PropertyFormData> }) {
  const { register, formState: { errors }, setValue } = form
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [generatingShort, setGeneratingShort] = useState(false)

  async function handleGenerateDescription() {
    const values = form.getValues()
    if (!values.type) {
      toast.warning("Completá al menos el tipo de propiedad para generar la descripción")
      return
    }
    setGeneratingDesc(true)
    try {
      const description = await generateDescriptionFromFormData(values)
      setValue("description", description, { shouldValidate: true })
      toast.success("Descripción generada con IA")
    } catch {
      toast.error("Error al generar la descripción")
    } finally {
      setGeneratingDesc(false)
    }
  }

  async function handleGenerateShortDescription() {
    const values = form.getValues()
    if (!values.type) {
      toast.warning("Completá al menos el tipo de propiedad para generar la descripción corta")
      return
    }
    setGeneratingShort(true)
    try {
      const short = await generateShortDescriptionFromFormData(values)
      setValue("shortDescription", short, { shouldValidate: true })
      toast.success("Descripción corta generada con IA")
    } catch {
      toast.error("Error al generar la descripción corta")
    } finally {
      setGeneratingShort(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Título y descripción</h2>
      <p className="text-sm text-muted-foreground">
        Con todos los datos cargados, ahora podés generar el título y las descripciones con ayuda de la IA.
      </p>

      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...register("title")} placeholder="Ej: Casa moderna en Palermo" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Descripción *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={generatingDesc}
            onClick={handleGenerateDescription}
          >
            {generatingDesc ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-3" />
            )}
            Generar con IA
          </Button>
        </div>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe la propiedad..."
          rows={5}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="shortDescription">Descripción corta</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={generatingShort}
            onClick={handleGenerateShortDescription}
          >
            {generatingShort ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-3" />
            )}
            Generar con IA
          </Button>
        </div>
        <Textarea
          id="shortDescription"
          {...register("shortDescription")}
          placeholder="Resumen breve para listados y redes sociales..."
          rows={2}
        />
      </div>
    </div>
  )
}
