"use client"

import { PropertyFormWizard } from "./property-form/property-form-wizard"
import type { PropertyFormData } from "@/lib/types/property"

interface PropertyEditFormProps {
  propertyId: string
  initialData: PropertyFormData
}

export function PropertyEditForm({ propertyId, initialData }: PropertyEditFormProps) {
  return <PropertyFormWizard propertyId={propertyId} initialData={initialData} />
}
