"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getPropertiesUseCase } from "@/features/properties/application/get-properties.use-case"
import { getPropertyByIdUseCase } from "@/features/properties/application/get-property-by-id.use-case"
import { createPropertyUseCase } from "@/features/properties/application/create-property.use-case"
import { updatePropertyUseCase } from "@/features/properties/application/update-property.use-case"
import { deletePropertyUseCase } from "@/features/properties/application/delete-property.use-case"
import { duplicatePropertyUseCase } from "@/features/properties/application/duplicate-property.use-case"
import type { Property, PropertyFormData } from "@/features/properties/domain/property.entity"

// ---------------------------------------------------------------------------
// Authenticated actions (require session context)
// ---------------------------------------------------------------------------

export async function getPropertiesAction(): Promise<Property[]> {
  const ctx = await getSessionContext()
  return getPropertiesUseCase(ctx)
}

export async function getPropertyByIdAction(
  id: string,
): Promise<Property | undefined> {
  const ctx = await getSessionContext()
  return getPropertyByIdUseCase(ctx, id)
}

export async function createPropertyAction(
  data: PropertyFormData,
): Promise<Property> {
  const ctx = await getSessionContext()
  return createPropertyUseCase(ctx, data)
}

export async function updatePropertyAction(
  id: string,
  data: Partial<Property>,
): Promise<Property> {
  const ctx = await getSessionContext()
  return updatePropertyUseCase(ctx, id, data)
}

export async function deletePropertyAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deletePropertyUseCase(ctx, id)
}

export async function duplicatePropertyAction(
  id: string,
): Promise<Property> {
  const ctx = await getSessionContext()
  return duplicatePropertyUseCase(ctx, id)
}

