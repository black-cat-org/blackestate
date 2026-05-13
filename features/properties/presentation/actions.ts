"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getPropertiesUseCase } from "@/features/properties/application/get-properties.use-case"
import { getActivePropertiesUseCase } from "@/features/properties/application/get-active-properties.use-case"
import { getDeletedPropertiesUseCase } from "@/features/properties/application/get-deleted-properties.use-case"
import { getPropertyByIdUseCase } from "@/features/properties/application/get-property-by-id.use-case"
import { createPropertyUseCase } from "@/features/properties/application/create-property.use-case"
import { updatePropertyUseCase } from "@/features/properties/application/update-property.use-case"
import { deletePropertyUseCase } from "@/features/properties/application/delete-property.use-case"
import { restorePropertyUseCase } from "@/features/properties/application/restore-property.use-case"
import { duplicatePropertyUseCase } from "@/features/properties/application/duplicate-property.use-case"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { deleteFiles } from "@/lib/supabase/storage"
import type { Property, PropertyFormData } from "@/features/properties/domain/property.entity"

// ---------------------------------------------------------------------------
// Authenticated actions (require session context)
// ---------------------------------------------------------------------------

export async function getPropertiesAction(): Promise<Property[]> {
  const ctx = await getSessionContext()
  return getPropertiesUseCase(ctx)
}

export async function getActivePropertiesAction(): Promise<Property[]> {
  const ctx = await getSessionContext()
  return getActivePropertiesUseCase(ctx)
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
  // Wire the batched storage delete so the use case can clean up orphaned
  // photo objects when `data.media.photos` drops one or more URLs in a
  // single save. The client is created unconditionally (cheap — it reuses
  // the per-request cookie cache) so the use case can decide whether
  // cleanup applies based on the patch shape.
  const client = await getSupabaseServerClient()
  return updatePropertyUseCase(ctx, id, data, {
    deletePhotos: (paths) => deleteFiles(client, "property-media", paths),
  })
}

export async function deletePropertyAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deletePropertyUseCase(ctx, id)
}

export async function getDeletedPropertiesAction(): Promise<Property[]> {
  const ctx = await getSessionContext()
  return getDeletedPropertiesUseCase(ctx)
}

export async function restorePropertyAction(id: string): Promise<Property> {
  const ctx = await getSessionContext()
  return restorePropertyUseCase(ctx, id)
}

export async function duplicatePropertyAction(
  id: string,
): Promise<Property> {
  const ctx = await getSessionContext()
  return duplicatePropertyUseCase(ctx, id)
}

