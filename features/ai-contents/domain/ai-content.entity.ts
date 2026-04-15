export type AiContentType = "description" | "caption" | "hashtags" | "brochure"
export type AiPlatform = "facebook" | "instagram" | "tiktok" | "whatsapp"

export interface AiContentAnalytics {
  views?: number
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
}

export interface AiContent {
  id: string
  propertyId: string
  propertyTitle: string
  type: AiContentType
  platform?: AiPlatform
  text: string
  createdAt: string
  updatedAt?: string
  publishedAt?: string
  publishedTo?: AiPlatform
  analytics?: AiContentAnalytics
}

export interface AiContentFilters {
  search: string
  type: AiContentType | "all"
  propertyId: string | "all"
}

export interface MarketingKitStatus {
  captions: Record<AiPlatform, boolean>
  hasHashtags: boolean
  hasBrochure: boolean
  completedCount: number
  percentage: number
}
