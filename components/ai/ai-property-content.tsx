"use client"

import { AiDescriptionGenerator } from "@/components/ai/ai-description-generator"
import { AiCaptionGenerator } from "@/components/ai/ai-caption-generator"
import { AiHashtagLibrary } from "@/components/ai/ai-hashtag-library"
import { AiBrochureGenerator } from "@/components/ai/ai-brochure-generator"
import type { Property } from "@/lib/types/property"

interface AiPropertyContentProps {
  property: Property
}

export function AiPropertyContent({ property }: AiPropertyContentProps) {
  return (
    <div className="space-y-6">
      <AiDescriptionGenerator property={property} />
      <AiCaptionGenerator property={property} />
      <AiHashtagLibrary property={property} />
      <AiBrochureGenerator property={property} />
    </div>
  )
}
