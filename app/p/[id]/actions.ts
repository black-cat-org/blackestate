"use server"

import { createLeadAction } from "@/features/leads/presentation/actions"
import { trackVisitAction as trackVisit } from "@/features/leads/presentation/public-actions"
import { leadFormSchema } from "@/lib/validations/lead"

export async function submitLeadAction(
  propertyId: string,
  source: string | null,
  formData: {
    name: string
    phone: string
    email: string
    message?: string
    propertyTypeSought?: string
    budget?: string
    zoneOfInterest?: string
    wantsOffers: boolean
  }
) {
  const parsed = leadFormSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" }
  }

  try {
    await createLeadAction({
      propertyId,
      source: source ?? undefined,
      ...parsed.data,
    })
    return { success: true }
  } catch {
    return { success: false, error: "Error al guardar la consulta" }
  }
}

export async function trackVisitAction(propertyId: string, source: string | null) {
  try {
    await trackVisit(propertyId, source)
    return { success: true }
  } catch {
    return { success: false }
  }
}
