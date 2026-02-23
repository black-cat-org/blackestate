import { Facebook, Instagram, Hash, MessageCircle, type LucideIcon } from "lucide-react"
import type { AiContentType, AiPlatform } from "@/lib/types/ai-content"

export const AI_CONTENT_TYPE_LABELS: Record<AiContentType, string> = {
  descripcion: "Descripcion",
  caption: "Caption",
  hashtags: "Hashtags",
  brochure: "Brochure",
}

export const AI_PLATFORM_LABELS: Record<AiPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
}

export const AI_PLATFORM_ICONS: Record<AiPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Hash,
  whatsapp: MessageCircle,
}

export const DEFAULT_HASHTAGS: string[] = [
  "#inmobiliaria",
  "#propiedades",
  "#bienesraices",
  "#inversion",
  "#hogar",
  "#realestate",
  "#venta",
  "#alquiler",
  "#casa",
  "#departamento",
  "#terreno",
  "#oportunidad",
]

export const MARKETING_KIT_TOTAL = 6
