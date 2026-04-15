"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AiCaptionGenerator } from "@/features/ai-contents/presentation/components/ai-caption-generator"
import { AiHashtagLibrary } from "@/features/ai-contents/presentation/components/ai-hashtag-library"
import { AiBrochureGenerator } from "@/features/ai-contents/presentation/components/ai-brochure-generator"
import type { Property } from "@/features/properties/domain/property.entity"
import type { AiContentType, AiPlatform } from "@/features/ai-contents/domain/ai-content.entity"

const DIALOG_TITLES: Record<string, string> = {
  caption: "Generar caption",
  hashtags: "Biblioteca de hashtags",
  brochure: "Generar brochure PDF",
}

interface MarketingKitGeneratorDialogProps {
  type: AiContentType
  property: Property
  platform?: AiPlatform
  open: boolean
  onOpenChange: (open: boolean) => void
  onContentSaved: () => void
}

export function MarketingKitGeneratorDialog({
  type,
  property,
  platform,
  open,
  onOpenChange,
  onContentSaved,
}: MarketingKitGeneratorDialogProps) {
  function handleSaved() {
    onContentSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLES[type]}</DialogTitle>
        </DialogHeader>
        {type === "caption" && (
          <AiCaptionGenerator property={property} defaultPlatform={platform} onSave={handleSaved} />
        )}
        {type === "hashtags" && (
          <AiHashtagLibrary property={property} onSave={handleSaved} />
        )}
        {type === "brochure" && (
          <AiBrochureGenerator property={property} onGenerated={handleSaved} />
        )}
      </DialogContent>
    </Dialog>
  )
}
