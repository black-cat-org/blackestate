"use client"

import { useState } from "react"
import { Copy, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { deleteAiContentAction } from "@/features/ai-contents/presentation/actions"
import { AI_CONTENT_TYPE_LABELS, AI_PLATFORM_LABELS } from "@/lib/constants/ai"
import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"

interface MarketingKitContentCardProps {
  content: AiContent
  extraCopyText?: string
  onRefresh: () => void
}

export function MarketingKitContentCard({ content, extraCopyText, onRefresh }: MarketingKitContentCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const textToCopy = extraCopyText ? `${content.text}\n\n${extraCopyText}` : content.text
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast.success("Copiado al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    await deleteAiContentAction(content.id)
    onRefresh()
    toast.success("Contenido eliminado")
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{AI_CONTENT_TYPE_LABELS[content.type]}</Badge>
            {content.platform && (
              <Badge variant="outline">{AI_PLATFORM_LABELS[content.platform]}</Badge>
            )}
            {content.publishedAt && (
              <Badge className="bg-green-100 text-green-800">Publicado</Badge>
            )}
          </div>
          <p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-line">
            {content.text}
          </p>
          <p className="text-muted-foreground text-xs">
            {new Date(content.createdAt).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopy} title={extraCopyText ? "Copiar publicacion" : "Copiar"}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
