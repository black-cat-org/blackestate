"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { updateMarketingSettingsAction } from "@/features/settings/presentation/actions"
import { toast } from "sonner"
import type { MarketingSettings } from "@/features/settings/domain/settings.entity"

interface MarketingSectionProps {
  data: MarketingSettings
}

export function MarketingSection({ data: initialData }: MarketingSectionProps) {
  const [data, setData] = useState<MarketingSettings>(initialData)
  const [saving, setSaving] = useState(false)
  const [hashtagInput, setHashtagInput] = useState("")

  function handleHashtagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      const tag = hashtagInput.trim()
      if (tag && !data.defaultHashtags.includes(tag)) {
        const formatted = tag.startsWith("#") ? tag : `#${tag}`
        setData((prev) => ({ ...prev, defaultHashtags: [...prev.defaultHashtags, formatted] }))
      }
      setHashtagInput("")
    }
  }

  function removeHashtag(tag: string) {
    setData((prev) => ({ ...prev, defaultHashtags: prev.defaultHashtags.filter((t) => t !== tag) }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateMarketingSettingsAction(data)
      toast.success("Configuración guardada")
    } catch {
      toast.error("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Marketing</h3>
        <p className="text-sm text-muted-foreground">Hashtags, firma y branding</p>
      </div>

      {/* Hashtags */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Hashtags por defecto</h4>
          <p className="text-xs text-muted-foreground">Presiona Enter para agregar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.defaultHashtags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => removeHashtag(tag)} className="ml-0.5 hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          value={hashtagInput}
          onChange={(e) => setHashtagInput(e.target.value)}
          onKeyDown={handleHashtagKeyDown}
          placeholder="Agregar hashtag..."
        />
      </div>

      <Separator />

      {/* Email signature */}
      <div className="space-y-2">
        <Label htmlFor="signature">Firma de email</Label>
        <Textarea
          id="signature"
          value={data.emailSignature}
          onChange={(e) => setData((prev) => ({ ...prev, emailSignature: e.target.value }))}
          rows={4}
        />
      </div>

      <Separator />

      {/* Brochure color */}
      <div className="space-y-2">
        <Label htmlFor="brochure-color">Color de brochure</Label>
        <div className="flex items-center gap-3">
          <input
            id="brochure-color"
            type="color"
            value={data.brochureColor}
            onChange={(e) => setData((prev) => ({ ...prev, brochureColor: e.target.value }))}
            className="h-9 w-12 cursor-pointer rounded border"
          />
          <span className="text-sm text-muted-foreground">{data.brochureColor}</span>
        </div>
      </div>

      <Separator />

      {/* AI Language */}
      <div className="space-y-2">
        <Label htmlFor="ai-lang">Idioma de IA</Label>
        <Select value={data.aiLanguage} onValueChange={(v) => setData((prev) => ({ ...prev, aiLanguage: v }))}>
          <SelectTrigger id="ai-lang" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Watermark */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Marca de agua</h4>
            <p className="text-xs text-muted-foreground">Agregar marca de agua a las imágenes</p>
          </div>
          <Switch
            checked={data.watermarkEnabled}
            onCheckedChange={(enabled) => setData((prev) => ({ ...prev, watermarkEnabled: enabled }))}
          />
        </div>
        {data.watermarkEnabled && (
          <Input
            value={data.watermarkText}
            onChange={(e) => setData((prev) => ({ ...prev, watermarkText: e.target.value }))}
            placeholder="Texto de marca de agua"
          />
        )}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
