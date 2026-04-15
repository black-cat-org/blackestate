import type { Lead } from "@/features/leads/domain/lead.entity"
import type { Property } from "@/features/properties/domain/property.entity"
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/property"

/**
 * Finds properties that match a lead's preferences automatically.
 * Matches based on: property type, budget range, zone of interest, and operation type.
 * Excludes the property the lead originally came from.
 *
 * This is pure domain logic — no DB access.
 */
export function getSuggestedPropertiesUseCase(
  lead: Lead,
  allProperties: Property[],
): Property[] {
  const active = allProperties.filter(
    (p) => p.status === "active" && p.id !== lead.propertyId,
  )

  if (active.length === 0) return []

  const budgetRange = parseBudgetRange(lead.budget)

  // Match property type label to PropertyType
  const soughtType = lead.propertyTypeSought
    ? Object.entries(PROPERTY_TYPE_LABELS).find(
        ([, label]) =>
          label.toLowerCase() === lead.propertyTypeSought!.toLowerCase(),
      )?.[0]
    : undefined

  // Zone keywords
  const zoneKeywords = lead.zoneOfInterest
    ? lead.zoneOfInterest
        .split(/[\/,]/)
        .map((z) => z.trim().toLowerCase())
        .filter(Boolean)
    : []

  // Score each property
  const scored = active.map((p) => {
    let score = 0

    // Type match
    if (soughtType && p.type === soughtType) score += 3

    // Budget match
    if (budgetRange) {
      const amount = p.price.amount
      if (amount >= budgetRange.min && amount <= budgetRange.max) {
        score += 3
      } else if (
        amount >= budgetRange.min * 0.8 &&
        amount <= budgetRange.max * 1.2
      ) {
        score += 1 // Close to budget
      }
    }

    // Zone match
    if (zoneKeywords.length > 0) {
      const propZone = [p.address.neighborhood, p.address.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      for (const keyword of zoneKeywords) {
        if (propZone.includes(keyword)) {
          score += 2
          break
        }
      }
    }

    // Base relevance for being active (weakest signal)
    if (score === 0) {
      score += 0.5
    }

    return { property: p, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.property)
}

function parseBudgetRange(
  budget?: string,
): { min: number; max: number } | null {
  if (!budget) return null

  // Remove currency prefix and normalize
  const cleaned = budget
    .replace(/USD|ARS|EUR|BOB/gi, "")
    .replace(/\/mes/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()

  // Try range: "400000 - 500000"
  const rangeMatch = cleaned.match(/(\d+)\s*-\s*(\d+)/)
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) }
  }

  // Single number
  const singleMatch = cleaned.match(/(\d+)/)
  if (singleMatch) {
    const val = Number(singleMatch[1])
    return { min: val * 0.8, max: val * 1.2 }
  }

  return null
}
