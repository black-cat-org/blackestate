"use client"

import { useState } from "react"
import { Copy, Check, Sparkles, RefreshCw, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { AI_PLATFORM_LABELS, AI_PLATFORM_ICONS } from "@/lib/constants/ai"
import type { AiContent, AiPlatform } from "@/lib/types/ai-content"

interface MarketingKitCaptionGridProps {
  captions: Record<AiPlatform, AiContent | undefined>
  hashtagsText?: string
  onGenerate: (platform: AiPlatform) => void
  locked?: boolean
}

const PLATFORMS: AiPlatform[] = ["instagram", "facebook", "tiktok", "whatsapp"]

export function MarketingKitCaptionGrid({ captions, hashtagsText, onGenerate, locked }: MarketingKitCaptionGridProps) {
  const [copiedPlatform, setCopiedPlatform] = useState<AiPlatform | null>(null)

  async function handleCopy(platform: AiPlatform) {
    const caption = captions[platform]
    if (!caption) return
    const needsHashtags = platform === "instagram" || platform === "tiktok"
    const text = needsHashtags && hashtagsText
      ? `${caption.text}\n\n${hashtagsText}`
      : caption.text
    await navigator.clipboard.writeText(text)
    setCopiedPlatform(platform)
    toast.success("Caption copiado al portapapeles")
    setTimeout(() => setCopiedPlatform(null), 2000)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PLATFORMS.map((platform) => {
        const Icon = AI_PLATFORM_ICONS[platform]
        const caption = captions[platform]
        const isCopied = copiedPlatform === platform

        return (
          <Card key={platform}>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <span className="text-sm font-medium">{AI_PLATFORM_LABELS[platform]}</span>
                </div>
                {caption ? (
                  <Badge variant="outline" className="border-green-300 text-green-700">Listo</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Pendiente</Badge>
                )}
              </div>

              {caption ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-line">
                    {caption.text}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(platform)}>
                      {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {isCopied ? "Copiado" : (platform === "instagram" || platform === "tiktok") && hashtagsText ? "Copiar publicacion" : "Copiar"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onGenerate(platform)}>
                      <RefreshCw className="size-4" />
                      Regenerar
                    </Button>
                  </div>
                </div>
              ) : locked ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Lock className="size-3" />
                  Generá los hashtags primero
                </p>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={() => onGenerate(platform)}>
                  <Sparkles className="size-4" />
                  Generar
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
