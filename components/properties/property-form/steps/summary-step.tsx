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
  EQUIPMENT_OPTIONS,
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
  const allAmenities = values.amenities || []
  const equipmentValues = EQUIPMENT_OPTIONS.map((o) => o.value as string)
  const amenityValues = AMENITIES_OPTIONS.map((o) => o.value as string)

  const equipmentLabels = allAmenities
    .filter((a) => equipmentValues.includes(a))
    .map((a) => EQUIPMENT_OPTIONS.find((o) => o.value === a)?.label || a)
    .join(", ")

  const amenityLabels = allAmenities
    .filter((a) => amenityValues.includes(a))
    .map((a) => AMENITIES_OPTIONS.find((o) => o.value === a)?.label || a)
    .join(", ")

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Resumen</h2>
      <p className="text-sm text-muted-foreground">
        Revisa los datos antes de guardar. Puedes editar cualquier sección.
      </p>

      {/* Step 0: Datos de la propiedad */}
      <SummarySection title="Datos de la propiedad" stepIndex={0} onEdit={onGoToStep}>
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
      </SummarySection>

      {/* Step 1: Ubicación */}
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

      {/* Step 2: Características */}
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
        <SummaryRow label="Dormitorios" value={values.bedrooms || undefined} />
        <SummaryRow label="Baños" value={values.bathrooms || undefined} />
        <SummaryRow label="Estacionamiento" value={values.garages || undefined} />
        <SummaryRow label="Antigüedad" value={values.age ? `${values.age} años` : undefined} />
        <SummaryRow
          label="Condición"
          value={values.condition ? CONDITION_OPTIONS.find((o) => o.value === values.condition)?.label : undefined}
        />
        <SummaryRow
          label="Orientación"
          value={values.orientation ? ORIENTATION_OPTIONS.find((o) => o.value === values.orientation)?.label : undefined}
        />
        {equipmentLabels && <SummaryRow label="Equipamiento del inmueble" value={equipmentLabels} />}
        {amenityLabels && <SummaryRow label="Amenidades" value={amenityLabels} />}
      </SummarySection>

      {/* Step 3: Contenido multimedia */}
      <SummarySection title="Contenido multimedia" stepIndex={3} onEdit={onGoToStep}>
        <SummaryRow label="Fotos" value={`${values.photos?.length || 0} archivos`} />
        <SummaryRow label="Video" value={values.videoUrl} />
        <SummaryRow label="Tour virtual" value={values.virtualTourUrl} />
      </SummarySection>

      {/* Step 4: Título y descripción */}
      <SummarySection title="Título y descripción" stepIndex={4} onEdit={onGoToStep}>
        <SummaryRow label="Título" value={values.title} />
        <SummaryRow label="Descripción" value={values.description} />
        <SummaryRow label="Descripción corta" value={values.shortDescription} />
      </SummarySection>
    </div>
  )
}
