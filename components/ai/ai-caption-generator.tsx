"use client"

import { useState } from "react"
import { Copy, Check, Sparkles, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "sonner"
import { generateCaption } from "@/lib/services/ai-mock"
import { createAiContent } from "@/lib/data/ai-contents"
import { AI_PLATFORM_LABELS, AI_PLATFORM_ICONS } from "@/lib/constants/ai"
import { getHashtags } from "@/lib/data/hashtags"
import type { Property } from "@/lib/types/property"
import type { AiPlatform } from "@/lib/types/ai-content"

interface AiCaptionGeneratorProps {
  property: Property
}

export function AiCaptionGenerator({ property }: AiCaptionGeneratorProps) {
  const [platform, setPlatform] = useState<AiPlatform>("instagram")
  const [customNote, setCustomNote] = useState("")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  async function handleGenerate() {
    setLoading(true)
    try {
      let result = await generateCaption(property, platform, customNote || undefined)

      if (platform === "instagram" || platform === "tiktok") {
        const hashtags = getHashtags()
        result += `\n\n${hashtags.join(" ")}`
      }

      setText(result)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Caption copiado al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    await createAiContent({
      propertyId: property.id,
      propertyTitle: property.title,
      type: "caption",
      platform,
      text,
    })
    toast.success("Caption guardado")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" />
          Captions para redes sociales
        </CardTitle>
        <CardDescription>
          Genera textos optimizados para cada plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Plataforma</label>
          <ToggleGroup
            type="single"
            value={platform}
            onValueChange={(v) => v && setPlatform(v as AiPlatform)}
            variant="outline"
          >
            {(Object.entries(AI_PLATFORM_LABELS) as [AiPlatform, string][]).map(
              ([key, label]) => {
                const Icon = AI_PLATFORM_ICONS[key]
                return (
                  <ToggleGroupItem key={key} value={key}>
                    <Icon className="size-4" />
                    {label}
                  </ToggleGroupItem>
                )
              }
            )}
          </ToggleGroup>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Incluir algo específico (opcional)
          </label>
          <Input
            placeholder='Ej: "mencionar la pileta"'
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
          />
        </div>

        <Button onClick={handleGenerate} disabled={loading}>
          <Sparkles className="size-4" />
          Generar caption
        </Button>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {text && !loading && (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="resize-y"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="size-4" />
                Guardar
              </Button>
              <Button variant="ghost" size="sm" onClick={handleGenerate}>
                <RefreshCw className="size-4" />
                Regenerar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
