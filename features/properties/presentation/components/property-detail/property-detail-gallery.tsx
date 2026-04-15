"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ExternalLink, ImageIcon, Video, XIcon } from "lucide-react"
import { useLightbox } from "@/hooks/use-lightbox"
import type { Property } from "@/lib/types/property"

export function PropertyDetailGallery({ property }: { property: Property }) {
  const photos = property.media.photos
  const { open, setOpen, currentIndex, openAt, goToPrevious, goToNext, swipeHandlers } =
    useLightbox({ total: photos.length })

  return (
    <div className="space-y-4">
      {photos.length > 0 ? (
        <div className="grid gap-2">
          <button
            onClick={() => openAt(0)}
            className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src={photos[0]}
              alt={property.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          </button>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.slice(1, 5).map((photo, i) => (
                <button
                  key={i}
                  onClick={() => openAt(i + 1)}
                  className={cn(
                    "bg-muted relative aspect-square w-20 shrink-0 overflow-hidden rounded-md sm:w-24",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <Image
                    src={photo}
                    alt={`${property.title} - Foto ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                  {i === 3 && photos.length > 5 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                      +{photos.length - 5}
                    </div>
                  )}
                </button>
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

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-[90vw] gap-0 overflow-hidden rounded-lg border-none bg-black p-0 sm:max-w-4xl">
          <DialogTitle className="sr-only">
            {property.title} - Foto {currentIndex + 1} de {photos.length}
          </DialogTitle>

          <DialogClose className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80 focus:outline-none">
            <XIcon className="size-4" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>

          <div className="relative aspect-[4/3]" {...swipeHandlers}>
            {photos.length > 0 && (
              <Image
                src={photos[currentIndex]}
                alt={`${property.title} - Foto ${currentIndex + 1}`}
                fill
                className="object-cover"
                sizes="90vw"
              />
            )}
          </div>

          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              >
                <ChevronLeftIcon className="size-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              >
                <ChevronRightIcon className="size-6" />
              </Button>
            </>
          )}

          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
            {currentIndex + 1} / {photos.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
