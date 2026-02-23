export type AiContentType = "descripcion" | "caption" | "hashtags"
export type AiPlatform = "facebook" | "instagram" | "tiktok" | "whatsapp"

export interface AiContent {
  id: string
  propertyId: string
  propertyTitle: string
  type: AiContentType
  platform?: AiPlatform
  text: string
  createdAt: string
}

export interface AiContentFilters {
  search: string
  type: AiContentType | "all"
  propertyId: string | "all"
}
