import type { AiContent, AiPlatform, MarketingKitStatus } from "@/lib/types/ai-content"
import { MARKETING_KIT_TOTAL } from "@/lib/constants/ai"

const PLATFORMS: AiPlatform[] = ["instagram", "facebook", "tiktok", "whatsapp"]

export function computeKitStatus(contents: AiContent[]): MarketingKitStatus {
  const captions = Object.fromEntries(
    PLATFORMS.map((p) => [p, contents.some((c) => c.type === "caption" && c.platform === p)])
  ) as Record<AiPlatform, boolean>
  const hasHashtags = contents.some((c) => c.type === "hashtags")
  const hasBrochure = contents.some((c) => c.type === "brochure")

  const completedCount =
    PLATFORMS.filter((p) => captions[p]).length +
    (hasHashtags ? 1 : 0) +
    (hasBrochure ? 1 : 0)

  return {
    captions,
    hasHashtags,
    hasBrochure,
    completedCount,
    percentage: Math.round((completedCount / MARKETING_KIT_TOTAL) * 100),
  }
}
