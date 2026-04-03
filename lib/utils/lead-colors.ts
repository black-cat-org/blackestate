/**
 * Generates a consistent HSL color for a lead based on their ID.
 * Same lead always gets the same color.
 */

const LEAD_HUES = [210, 340, 150, 30, 270, 180, 60, 310]

export function getLeadColor(leadId: string): string {
  const index = Math.abs(hashCode(leadId)) % LEAD_HUES.length
  const hue = LEAD_HUES[index]
  return `hsl(${hue}, 65%, 55%)`
}

export function getLeadColorLight(leadId: string): string {
  const index = Math.abs(hashCode(leadId)) % LEAD_HUES.length
  const hue = LEAD_HUES[index]
  return `hsl(${hue}, 70%, 80%)`
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}
