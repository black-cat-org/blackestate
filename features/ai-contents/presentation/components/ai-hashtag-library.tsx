"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Hash, Plus, X, Sparkles, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { getHashtagsAction, addHashtagAction, addHashtagsAction, removeHashtagAction, createAiContentAction } from "@/features/ai-contents/presentation/actions"
import { generateHashtags } from "@/lib/services/ai-mock"
import type { Property } from "@/features/properties/domain/property.entity"

interface AiHashtagLibraryProps {
  property: Property
  onSave?: () => void
}

export function AiHashtagLibrary({ property, onSave }: AiHashtagLibraryProps) {
  const [hashtags, setHashtags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { getHashtagsAction().then(setHashtags) }, [])

  async function refresh() {
    setHashtags(await getHashtagsAction())
  }

  async function handleSuggest() {
    setLoading(true)
    try {
      const result = await generateHashtags(property)
      const currentTags = await getHashtagsAction()
      setSuggestions(result.filter((t) => !currentTags.includes(t)))
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSuggestion(tag: string) {
    await addHashtagAction(tag)
    setSuggestions((prev) => prev.filter((t) => t !== tag))
    await refresh()
  }

  async function handleAddAllSuggestions() {
    await addHashtagsAction(suggestions)
    setSuggestions([])
    await refresh()
    toast.success("Hashtags agregados")
  }

  async function handleAdd() {
    if (!newTag.trim()) return
    await addHashtagAction(newTag.trim())
    setNewTag("")
    await refresh()
  }

  async function handleRemove(tag: string) {
    await removeHashtagAction(tag)
    await refresh()
  }

  async function handleCopyAll() {
    const text = hashtags.join(" ")
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Hashtags copiados al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveAsContent() {
    if (hashtags.length === 0) {
      toast.error("No hay hashtags para guardar")
      return
    }
    await createAiContentAction({
      propertyId: property.id,
      propertyTitle: property.title,
      type: "hashtags",
      text: hashtags.join(" "),
    })
    toast.success("Hashtags guardados como contenido")
    onSave?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="size-5" />
          Biblioteca de hashtags
        </CardTitle>
        <CardDescription>
          Administra tus hashtags y genera sugerencias para esta propiedad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSuggest} disabled={loading}>
            <Sparkles className="size-4" />
            Sugerir hashtags
          </Button>
          <Button variant="outline" onClick={handleCopyAll}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiados" : "Copiar todos"}
          </Button>
          <Button variant="outline" onClick={handleSaveAsContent}>
            <Save className="size-4" />
            Guardar como contenido
          </Button>
        </div>

        {loading && (
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-22" />
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sugerencias</span>
              <Button variant="ghost" size="sm" onClick={handleAddAllSuggestions}>
                <Plus className="size-4" />
                Agregar todas
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleAddSuggestion(tag)}
                >
                  <Plus className="mr-1 size-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Agregar hashtag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button variant="outline" onClick={handleAdd} disabled={!newTag.trim()}>
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {hashtags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                onClick={() => handleRemove(tag)}
                className="hover:text-destructive ml-1"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
