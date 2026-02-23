"use client"

import { useState } from "react"
import { Copy, Check, Sparkles, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { generateDescription, improveDescription } from "@/lib/services/ai-mock"
import { createAiContent } from "@/lib/data/ai-contents"
import type { Property } from "@/lib/types/property"

interface AiDescriptionGeneratorProps {
  property: Property
}

export function AiDescriptionGenerator({ property }: AiDescriptionGeneratorProps) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  async function handleGenerate() {
    setLoading(true)
    try {
      const result = await generateDescription(property)
      setText(result)
    } finally {
      setLoading(false)
    }
  }

  async function handleImprove() {
    if (!text) {
      toast.error("Primero generá una descripción")
      return
    }
    setLoading(true)
    try {
      const result = await improveDescription(property, text)
      setText(result)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Descripción copiada al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    await createAiContent({
      propertyId: property.id,
      propertyTitle: property.title,
      type: "descripcion",
      text,
    })
    toast.success("Descripción guardada")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" />
          Descripción con IA
        </CardTitle>
        <CardDescription>
          Genera o mejora la descripción de la propiedad usando inteligencia artificial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={loading}>
            <Sparkles className="size-4" />
            Generar descripción
          </Button>
          <Button variant="outline" onClick={handleImprove} disabled={loading}>
            <RefreshCw className="size-4" />
            Mejorar existente
          </Button>
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
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
