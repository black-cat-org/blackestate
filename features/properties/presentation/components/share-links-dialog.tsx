"use client"

import { useState } from "react"
import { Facebook, Instagram, MessageCircle, Link2, Hash, Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ShareLinkItem } from "./share-link-item"
import { VALID_SOURCES, SOURCE_LABELS, type LeadSource } from "@/lib/constants/sources"
import { toast } from "sonner"
import type { Property } from "@/lib/types/property"

const SOURCE_ICONS: Record<LeadSource, React.ReactNode> = {
  facebook: <Facebook className="size-4" />,
  instagram: <Instagram className="size-4" />,
  tiktok: <Hash className="size-4" />,
  whatsapp: <MessageCircle className="size-4" />,
  other: <Link2 className="size-4" />,
}

interface ShareLinksDialogProps {
  property: Property
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareLinksDialog({
  property,
  open,
  onOpenChange,
}: ShareLinksDialogProps) {
  const [customSource, setCustomSource] = useState("")
  const [customCopied, setCustomCopied] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const basePath = `${origin}/p/${property.id}`

  const customUrl = customSource.trim()
    ? `${basePath}?src=${encodeURIComponent(customSource.trim())}`
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir propiedad</DialogTitle>
          <DialogDescription>{property.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {VALID_SOURCES.filter((s) => s !== "other").map((source) => (
            <ShareLinkItem
              key={source}
              icon={SOURCE_ICONS[source]}
              label={SOURCE_LABELS[source]}
              url={`${basePath}?src=${source}`}
            />
          ))}
        </div>

        <Separator />

        <ShareLinkItem
          icon={<Link2 className="size-4" />}
          label="Sin seguimiento"
          url={basePath}
        />

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Personalizado</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="ej: linkedin, portal, email..."
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={!customUrl}
              onClick={async () => {
                if (!customUrl) return
                await navigator.clipboard.writeText(customUrl)
                setCustomCopied(true)
                toast.success("Link copiado")
                setTimeout(() => setCustomCopied(false), 2000)
              }}
            >
              {customCopied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="sr-only">Copiar link personalizado</span>
            </Button>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Solo funciona para propiedades activas.
        </p>
      </DialogContent>
    </Dialog>
  )
}
