"use server"

import { getPublicPropertyUseCase } from "@/features/properties/application/get-public-property.use-case"
import type { Property } from "@/features/properties/domain/property.entity"

export async function getPublicPropertyAction(
  id: string,
): Promise<Property | undefined> {
  return getPublicPropertyUseCase(id)
}
