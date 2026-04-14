export const VALID_SOURCES = [
  "facebook",
  "instagram",
  "tiktok",
  "whatsapp",
  "other",
] as const

export type LeadSource = (typeof VALID_SOURCES)[number]

export const SOURCE_LABELS: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  other: "Otro",
}

export function sanitizeSource(src: string | null | undefined): string | null {
  if (!src) return null
  const normalized = src.toLowerCase().trim()
  return (VALID_SOURCES as readonly string[]).includes(normalized) ? normalized : null
}
