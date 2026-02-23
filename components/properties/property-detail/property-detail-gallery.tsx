import Image from "next/image"
import { ExternalLink, ImageIcon, Video } from "lucide-react"
import type { Property } from "@/lib/types/property"

export function PropertyDetailGallery({ property }: { property: Property }) {
  const photos = property.media.photos

  return (
    <div className="space-y-4">
      {photos.length > 0 ? (
        <div className="grid gap-2">
          <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
            <Image
              src={photos[0]}
              alt={property.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          </div>
          {photos.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(1, 4).map((photo, i) => (
                <div key={i} className="bg-muted relative aspect-video overflow-hidden rounded-md">
                  <Image
                    src={photo}
                    alt={`${property.title} - Foto ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 33vw, 20vw"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted flex aspect-video items-center justify-center rounded-lg">
          <div className="text-center">
            <ImageIcon className="mx-auto size-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Sin fotos</p>
          </div>
        </div>
      )}
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
