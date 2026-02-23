import { ExternalLink, ImageIcon, Video } from "lucide-react"
import type { Property } from "@/lib/types/property"

export function PropertyDetailGallery({ property }: { property: Property }) {
  return (
    <div className="space-y-4">
      <div className="bg-muted flex aspect-video items-center justify-center rounded-lg">
        {property.media.photos.length > 0 ? (
          <div className="text-center">
            <ImageIcon className="mx-auto size-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {property.media.photos.length} foto(s) disponibles
            </p>
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="mx-auto size-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Sin fotos</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {property.media.videoUrl && (
          <a
            href={property.media.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
          >
            <Video className="size-4" />
            Ver video
            <ExternalLink className="size-3" />
          </a>
        )}
        {property.media.virtualTourUrl && (
          <a
            href={property.media.virtualTourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
          >
            Tour virtual
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  )
}
