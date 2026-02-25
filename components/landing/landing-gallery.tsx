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
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, XIcon } from "lucide-react"
import { useLightbox } from "@/hooks/use-lightbox"

interface LandingGalleryProps {
  photos: string[]
  title: string
}

export function LandingGallery({ photos, title }: LandingGalleryProps) {
  const { open, setOpen, currentIndex, openAt, goToPrevious, goToNext, swipeHandlers } =
    useLightbox({ total: photos.length })

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto size-12" />
          <p className="mt-2 text-sm">Sin fotos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-2">
        {/* Hero image */}
        <button
          onClick={() => openAt(0)}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={photos[0]}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
        </button>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.slice(1, 5).map((photo, index) => (
              <button
                key={index}
                onClick={() => openAt(index + 1)}
                className={cn(
                  "relative aspect-square w-20 shrink-0 overflow-hidden rounded-md sm:w-24",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <Image
                  src={photo}
                  alt={`${title} - Foto ${index + 2}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
                {index === 3 && photos.length > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                    +{photos.length - 5}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-[90vw] gap-0 overflow-hidden rounded-lg border-none bg-black p-0 sm:max-w-4xl">
          <DialogTitle className="sr-only">
            {title} - Foto {currentIndex + 1} de {photos.length}
          </DialogTitle>

          <DialogClose className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80 focus:outline-none">
            <XIcon className="size-4" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>

          <div className="relative aspect-[4/3]" {...swipeHandlers}>
            <Image
              src={photos[currentIndex]}
              alt={`${title} - Foto ${currentIndex + 1}`}
              fill
              className="object-cover"
              sizes="90vw"
            />
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
    </>
  )
}
