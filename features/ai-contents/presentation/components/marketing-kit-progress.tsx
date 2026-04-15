"use client"

import { Check } from "lucide-react"
import { AI_PLATFORM_LABELS } from "@/lib/constants/ai"
import { MARKETING_KIT_TOTAL } from "@/lib/constants/ai"
import type { MarketingKitStatus, AiPlatform } from "@/features/ai-contents/domain/ai-content.entity"

interface MarketingKitProgressProps {
  status: MarketingKitStatus
}

const PLATFORMS: AiPlatform[] = ["instagram", "facebook", "tiktok", "whatsapp"]

interface CheckItemProps {
  label: string
  done: boolean
}

function CheckItem({ label, done }: CheckItemProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
      {done ? (
        <Check className="size-3.5 text-green-600" />
      ) : (
        <span className="border-muted-foreground/40 inline-block size-3.5 rounded-sm border" />
      )}
      {label}
    </span>
  )
}

export function MarketingKitProgress({ status }: MarketingKitProgressProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${status.percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {status.percentage}% — {status.completedCount} de {MARKETING_KIT_TOTAL}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <CheckItem label="Hashtags" done={status.hasHashtags} />
        {PLATFORMS.map((p) => (
          <CheckItem key={p} label={AI_PLATFORM_LABELS[p]} done={status.captions[p]} />
        ))}
        <CheckItem label="Brochure" done={status.hasBrochure} />
      </div>
    </div>
  )
}
