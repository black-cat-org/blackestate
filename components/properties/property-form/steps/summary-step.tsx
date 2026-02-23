"use client"

import { UseFormReturn } from "react-hook-form"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      <div className="text-sm space-y-1">{children}</div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Resumen</h2>
      <p className="text-sm text-muted-foreground">
        Revisa los datos antes de guardar. Puedes editar cualquier sección.
      </p>

      <SummarySection title="Datos básicos" stepIndex={0} onEdit={onGoToStep}>
        <SummaryRow label="Título" value={values.title} />
        <SummaryRow label="Descripción" value={values.description} />
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
        {values.expenses && (
          <SummaryRow
            label="Expensas"
            value={`${CURRENCY_SYMBOLS[values.expensesCurrency as Currency] || values.expensesCurrency} ${Number(values.expenses).toLocaleString("es-AR")}`}
          />
        )}
      </SummarySection>

      <SummarySection title="Ubicación" stepIndex={1} onEdit={onGoToStep}>
        <SummaryRow
          label="Dirección"
          value={values.street ? `${values.street} ${values.number}${values.floor ? `, Piso ${values.floor}` : ""}${values.apartment ? ` ${values.apartment}` : ""}` : undefined}
        />
        <SummaryRow label="Ciudad" value={values.city} />
        <SummaryRow label="Provincia" value={values.state} />
        <SummaryRow label="País" value={values.country} />
        <SummaryRow label="Barrio" value={values.neighborhood} />
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
            label="Sup. cubierta"
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
        <SummaryRow label="Documentos" value={`${values.documents?.length || 0} archivos`} />
      </SummarySection>
    </div>
  )
}
