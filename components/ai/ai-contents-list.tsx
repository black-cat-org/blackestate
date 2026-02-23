"use client"

import { useState } from "react"
import Link from "next/link"
import { Copy, Check, Trash2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { deleteAiContent } from "@/lib/data/ai-contents"
import { AI_CONTENT_TYPE_LABELS, AI_PLATFORM_LABELS } from "@/lib/constants/ai"
import type { AiContent } from "@/lib/types/ai-content"

interface AiContentsListProps {
  contents: AiContent[]
  onRefresh: () => void
}

export function AiContentsList({ contents, onRefresh }: AiContentsListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleCopy(content: AiContent) {
    await navigator.clipboard.writeText(content.text)
    setCopiedId(content.id)
    toast.success("Texto copiado al portapapeles")
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleDelete(id: string) {
    await deleteAiContent(id)
    onRefresh()
    toast.success("Contenido eliminado")
  }

  if (contents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Sparkles className="text-muted-foreground mb-4 size-12" />
        <p className="text-muted-foreground text-lg">No hay contenidos guardados</p>
        <p className="text-muted-foreground text-sm">
          Genera contenido desde el detalle de una propiedad
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {contents.map((content) => (
        <Card key={content.id}>
          <CardContent className="flex items-start gap-4 p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/properties/${content.propertyId}`}
                  className="text-sm font-medium hover:underline"
                >
                  {content.propertyTitle}
                </Link>
                <Badge variant="secondary">
                  {AI_CONTENT_TYPE_LABELS[content.type]}
                </Badge>
                {content.platform && (
                  <Badge variant="outline">
                    {AI_PLATFORM_LABELS[content.platform]}
                  </Badge>
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
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(content)}
              >
                {copiedId === content.id ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(content.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
