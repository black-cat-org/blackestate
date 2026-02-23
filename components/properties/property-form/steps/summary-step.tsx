"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Check, Loader2, Pencil, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { generateDescriptionFromFormData, generateShortDescriptionFromFormData } from "@/lib/services/ai-mock"
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  CURRENCY_SYMBOLS,
  SURFACE_UNIT_LABELS,
  CONDITION_OPTIONS,
  ORIENTATION_OPTIONS,
  AMENITIES_OPTIONS,
} from "@/lib/constants/property"
import type { PropertyFormData, PropertyType, OperationType, Currency, SurfaceUnit } from "@/lib/types/property"

interface SummarySectionProps {
  title: string
  stepIndex: number
  onEdit: (step: number) => void
  children: React.ReactNode
}

function SummarySection({ title, stepIndex, onEdit, children }: SummarySectionProps) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(stepIndex)}>
          <Pencil className="mr-1 size-3" />
          Editar
        </Button>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between border-b border-border/50 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function SummaryStep({
  form,
  onGoToStep,
}: {
  form: UseFormReturn<PropertyFormData>
  onGoToStep: (step: number) => void
}) {
  const values = form.getValues()
  const currencySymbol = CURRENCY_SYMBOLS[values.currency as Currency] || values.currency
  const amenityLabels = (values.amenities || [])
    .map((a) => AMENITIES_OPTIONS.find((o) => o.value === a)?.label || a)
    .join(", ")
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [generatedDesc, setGeneratedDesc] = useState<string | null>(null)
  const [generatingShort, setGeneratingShort] = useState(false)
  const [generatedShort, setGeneratedShort] = useState<string | null>(null)

  async function handleGenerateDescription() {
    setGeneratingDesc(true)
    try {
      const description = await generateDescriptionFromFormData(form.getValues())
      setGeneratedDesc(description)
    } catch {
      toast.error("Error al generar la descripción")
    } finally {
      setGeneratingDesc(false)
    }
  }

  function handleAcceptDescription() {
    if (generatedDesc) {
      form.setValue("description", generatedDesc, { shouldValidate: true })
      toast.success("Descripción actualizada")
      setGeneratedDesc(null)
    }
  }

  function handleDiscardDescription() {
    setGeneratedDesc(null)
  }

  async function handleGenerateShortDescription() {
    setGeneratingShort(true)
    try {
      const short = await generateShortDescriptionFromFormData(form.getValues())
      setGeneratedShort(short)
    } catch {
      toast.error("Error al generar la descripción corta")
    } finally {
      setGeneratingShort(false)
    }
  }

  function handleAcceptShortDescription() {
    if (generatedShort) {
      form.setValue("shortDescription", generatedShort, { shouldValidate: true })
      toast.success("Descripción corta actualizada")
      setGeneratedShort(null)
    }
  }

  function handleDiscardShortDescription() {
    setGeneratedShort(null)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Resumen</h2>
      <p className="text-sm text-muted-foreground">
        Revisa los datos antes de guardar. Puedes editar cualquier sección.
      </p>

      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Datos básicos</h3>
          <div className="flex items-center gap-1">
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
            <Button type="button" variant="ghost" size="sm" onClick={() => onGoToStep(0)}>
              <Pencil className="mr-1 size-3" />
              Editar
            </Button>
          </div>
        </div>
        <div className="text-sm">
        <SummaryRow label="Título" value={values.title} />
        <SummaryRow label="Descripción" value={values.description} />
        <SummaryRow label="Descripción corta" value={values.shortDescription} />
        <div className="flex justify-end py-1">
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
            Generar desc. corta con IA
          </Button>
        </div>
        {generatedShort && (
          <div className="mt-2 space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Descripción corta generada por IA:</p>
            <Textarea
              value={generatedShort}
              onChange={(e) => setGeneratedShort(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={handleAcceptShortDescription}>
                <Check className="mr-1 size-3" />
                Aceptar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleDiscardShortDescription}>
                <X className="mr-1 size-3" />
                Descartar
              </Button>
            </div>
          </div>
        )}
        <SummaryRow
          label="Tipo"
          value={values.type ? PROPERTY_TYPE_LABELS[values.type as PropertyType] : undefined}
        />
        <SummaryRow
          label="Operación"
          value={values.operationType ? OPERATION_TYPE_LABELS[values.operationType as OperationType] : undefined}
        />
        <SummaryRow
          label="Precio"
          value={values.price ? `${currencySymbol} ${Number(values.price).toLocaleString("es-AR")}` : undefined}
        />
        <SummaryRow label="Negociable" value={values.negotiable ? "Sí" : "No"} />
        {values.expenses && (
          <SummaryRow
            label="Expensas"
            value={`${CURRENCY_SYMBOLS[values.expensesCurrency as Currency] || values.expensesCurrency} ${Number(values.expenses).toLocaleString("es-AR")}`}
          />
        )}
        {generatedDesc && (
          <div className="mt-3 space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Descripción generada por IA:</p>
            <Textarea
              value={generatedDesc}
              onChange={(e) => setGeneratedDesc(e.target.value)}
              rows={5}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={handleAcceptDescription}>
                <Check className="mr-1 size-3" />
                Aceptar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleDiscardDescription}>
                <X className="mr-1 size-3" />
                Descartar
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>

      <SummarySection title="Ubicación" stepIndex={1} onEdit={onGoToStep}>
        <SummaryRow label="País" value={values.country} />
        <SummaryRow label="Provincia" value={values.state} />
        <SummaryRow label="Ciudad" value={values.city} />
        <SummaryRow label="Barrio" value={values.neighborhood} />
        <SummaryRow
          label="Dirección"
          value={values.street ? `${values.street}${values.floor ? `, Piso ${values.floor}` : ""}${values.apartment ? ` ${values.apartment}` : ""}` : undefined}
        />
        {values.lat && values.lng && (
          <SummaryRow label="Coordenadas" value={`${values.lat}, ${values.lng}`} />
        )}
      </SummarySection>

      <SummarySection title="Características" stepIndex={2} onEdit={onGoToStep}>
        {values.totalArea && (
          <SummaryRow
            label="Sup. total"
            value={`${values.totalArea} ${SURFACE_UNIT_LABELS[values.surfaceUnit as SurfaceUnit]}`}
          />
        )}
        {values.coveredArea && (
          <SummaryRow
            label="Sup. construida"
            value={`${values.coveredArea} ${SURFACE_UNIT_LABELS[values.surfaceUnit as SurfaceUnit]}`}
          />
        )}
        <SummaryRow label="Ambientes" value={values.rooms || undefined} />
        <SummaryRow label="Dormitorios" value={values.bedrooms || undefined} />
        <SummaryRow label="Baños" value={values.bathrooms || undefined} />
        <SummaryRow label="Cocheras" value={values.garages || undefined} />
        <SummaryRow label="Antigüedad" value={values.age ? `${values.age} años` : undefined} />
        <SummaryRow
          label="Condición"
          value={values.condition ? CONDITION_OPTIONS.find((o) => o.value === values.condition)?.label : undefined}
        />
        <SummaryRow
          label="Orientación"
          value={values.orientation ? ORIENTATION_OPTIONS.find((o) => o.value === values.orientation)?.label : undefined}
        />
        {amenityLabels && <SummaryRow label="Amenities" value={amenityLabels} />}
      </SummarySection>

      <SummarySection title="Media" stepIndex={3} onEdit={onGoToStep}>
        <SummaryRow label="Fotos" value={`${values.photos?.length || 0} archivos`} />
        <SummaryRow label="Video" value={values.videoUrl} />
        <SummaryRow label="Tour virtual" value={values.virtualTourUrl} />
        <SummaryRow label="Planos" value={`${values.blueprints?.length || 0} archivos`} />
      </SummarySection>
    </div>
  )
}
