/**
 * Generates a consistent HSL color for any entity based on its stable
 * identifier. Same id always gets the same color.
 *
 * Feature-agnostic: any identity-bearing string (deal id, contact id,
 * appointment id, etc.) maps to a deterministic hue from a fixed
 * palette. Useful for UI timelines and badges that need stable color
 * coding without a separate persistence layer.
 */

const COLOR_HUES = [210, 340, 150, 30, 270, 180, 60, 310]

export function getStableColor(id: string): string {
  const index = Math.abs(hashCode(id)) % COLOR_HUES.length
  const hue = COLOR_HUES[index]
  return `hsl(${hue}, 65%, 55%)`
}

export function getStableColorLight(id: string): string {
  const index = Math.abs(hashCode(id)) % COLOR_HUES.length
  const hue = COLOR_HUES[index]
  return `hsl(${hue}, 70%, 80%)`
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}
