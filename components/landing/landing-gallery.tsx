"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon } from "lucide-react"

interface LandingGalleryProps {
  photos: string[]
  title: string
}

export function LandingGallery({ photos, title }: LandingGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

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

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const goToPrevious = () => {
    setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1))
  }

  const goToNext = () => {
    setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1))
  }

  return (
    <>
      <div className="grid gap-2">
        {/* Hero image */}
        <button
          onClick={() => openLightbox(0)}
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
                onClick={() => openLightbox(index + 1)}
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
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl border-none bg-black/95 p-0 sm:max-w-4xl">
          <DialogTitle className="sr-only">
            {title} - Foto {currentIndex + 1} de {photos.length}
          </DialogTitle>
          <div className="relative flex aspect-[4/3] items-center justify-center">
            <Image
              src={photos[currentIndex]}
              alt={`${title} - Foto ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
            />

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
          </div>

          <div className="pb-4 text-center text-sm text-white/70">
            {currentIndex + 1} / {photos.length}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
