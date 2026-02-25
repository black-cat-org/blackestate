"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, Trash2, FileText, Hash, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { MarketingKitProgress } from "@/components/ai/marketing-kit-progress"
import { MarketingKitCaptionGrid } from "@/components/ai/marketing-kit-caption-grid"
import { MarketingKitContentCard } from "@/components/ai/marketing-kit-content-card"
import { MarketingKitGeneratorDialog } from "@/components/ai/marketing-kit-generator-dialog"
import { computeKitStatus } from "@/hooks/use-marketing-kit"
import { getAiContentsByProperty, deleteAiContentsByProperty } from "@/lib/data/ai-contents"
import type { Property } from "@/lib/types/property"
import type { AiContent, AiContentType, AiPlatform } from "@/lib/types/ai-content"

interface MarketingKitViewProps {
  property: Property
}

export function MarketingKitView({ property }: MarketingKitViewProps) {
  const [contents, setContents] = useState<AiContent[]>([])
  const [loading, setLoading] = useState(true)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorType, setGeneratorType] = useState<AiContentType>("caption")
  const [generatorPlatform, setGeneratorPlatform] = useState<AiPlatform | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadContents = useCallback(async () => {
    const data = await getAiContentsByProperty(property.id)
    setContents(data)
    setLoading(false)
  }, [property.id])

  useEffect(() => {
    loadContents()
  }, [loadContents])

  const status = computeKitStatus(contents)

  const captionsByPlatform = Object.fromEntries(
    (["instagram", "facebook", "tiktok", "whatsapp"] as AiPlatform[]).map((p) => [
      p,
      contents.find((c) => c.type === "caption" && c.platform === p),
    ])
  ) as Record<AiPlatform, AiContent | undefined>

  const hashtagsContent = contents.find((c) => c.type === "hashtags")
  const brochureContent = contents.find((c) => c.type === "brochure")

  function openGenerator(type: AiContentType, platform?: AiPlatform) {
    setGeneratorType(type)
    setGeneratorPlatform(platform)
    setGeneratorOpen(true)
  }

  async function handleDeleteAll() {
    setDeleting(true)
    try {
      await deleteAiContentsByProperty(property.id)
      await loadContents()
      toast.success("Kit de marketing eliminado")
      setDeleteDialogOpen(false)
    } catch {
      toast.error("Error al eliminar el kit")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando kit de marketing...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="mb-2" asChild>
            <Link href={`/dashboard/properties/${property.id}`}>
              <ArrowLeft className="mr-2 size-4" />
              Volver a propiedad
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Kit de Marketing</h1>
          <p className="text-muted-foreground">{property.title}</p>
        </div>
      </div>

      <MarketingKitProgress status={status} />

      {/* Hashtags — primero, porque los captions dependen de ellos */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Hash className="size-5" />
          Hashtags
        </h2>
        {hashtagsContent ? (
          <MarketingKitContentCard content={hashtagsContent} onRefresh={loadContents} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">No hay hashtags generados</p>
            <Button variant="outline" onClick={() => openGenerator("hashtags")}>
              <Sparkles className="size-4" />
              Generar hashtags
            </Button>
          </div>
        )}
      </section>

      {/* Captions para redes */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Captions para redes</h2>
        <MarketingKitCaptionGrid
          captions={captionsByPlatform}
          hashtagsText={hashtagsContent?.text}
          onGenerate={(platform) => openGenerator("caption", platform)}
          hasHashtags={!!hashtagsContent}
        />
      </section>

      {/* Brochure PDF */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="size-5" />
          Brochure PDF
        </h2>
        {brochureContent ? (
          <div className="space-y-3">
            <MarketingKitContentCard content={brochureContent} onRefresh={loadContents} />
            <Button variant="outline" size="sm" onClick={() => openGenerator("brochure")}>
              Generar de nuevo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">No hay brochure generado</p>
            <Button variant="outline" onClick={() => openGenerator("brochure")}>
              <Sparkles className="size-4" />
              Generar brochure
            </Button>
          </div>
        )}
      </section>

      {/* Borrar kit */}
      {status.completedCount > 0 && (
        <div className="border-t pt-6">
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="size-4" />
            Borrar todo el kit
          </Button>
        </div>
      )}

      {/* Generator dialog */}
      <MarketingKitGeneratorDialog
        type={generatorType}
        property={property}
        platform={generatorPlatform}
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        onContentSaved={loadContents}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar kit de marketing</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés borrar todo el contenido de marketing de esta propiedad? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={deleting}>
              {deleting ? "Borrando..." : "Borrar todo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
