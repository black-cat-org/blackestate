"use client"

import { useCallback, useMemo, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { UseFormReturn } from "react-hook-form"
import Image from "next/image"
import { ImagePlus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PropertyFormData } from "@/features/properties/domain/property.entity"

interface PhotoPreview {
  id: string
  type: "url" | "file"
  src: string
  fileIndex?: number
}

function SortablePhoto({
  preview,
  index,
  onRemove,
}: {
  preview: PhotoPreview
  index: number
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preview.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? "opacity-50 shadow-lg scale-105" : ""
      }`}
    >
      <Image
        src={preview.src}
        alt={`Foto ${index + 1}`}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
        className="object-cover pointer-events-none select-none"
        draggable={false}
        unoptimized={preview.type === "file"}
      />

      {/* Remove button */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onRemove()
        }}
        className="absolute top-1.5 right-1.5 size-7 flex items-center justify-center rounded-full bg-black/50 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-black/70"
      >
        <X className="size-3.5" />
      </button>

      {/* Cover badge */}
      {index === 0 && (
        <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded pointer-events-none">
          Portada
        </span>
      )}
    </div>
  )
}

interface MediaStepProps {
  form: UseFormReturn<PropertyFormData>
  pendingFiles: File[]
  onFilesAdded: (files: File[]) => void
  onFileRemoved: (index: number) => void
  onExistingPhotoRemoved: (index: number) => void
  onReorder: (previews: PhotoPreview[]) => void
}

export type { PhotoPreview }

export function MediaStep({
  form,
  pendingFiles,
  onFilesAdded,
  onFileRemoved,
  onExistingPhotoRemoved,
  onReorder,
}: MediaStepProps) {
  const { register, watch } = form
  const existingPhotos = watch("photos") ?? []

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles)
    },
    [onFilesAdded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/avif": [".avif"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    useFsAccessApi: false,
  })

  const pendingPreviews = useMemo(
    () => pendingFiles.map((file) => URL.createObjectURL(file)),
    [pendingFiles],
  )

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [pendingPreviews])

  const allPreviews: PhotoPreview[] = [
    ...existingPhotos.map((url: string, i: number) => ({
      id: `existing-${i}`,
      type: "url" as const,
      src: url,
    })),
    ...pendingPreviews.map((src, i) => ({
      id: `pending-${i}`,
      type: "file" as const,
      src,
      fileIndex: i,
    })),
  ]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = allPreviews.findIndex((p) => p.id === active.id)
    const newIndex = allPreviews.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(allPreviews, oldIndex, newIndex)
    onReorder(reordered)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Contenido multimedia</h2>

      <div className="space-y-2">
        <Label>Fotos</Label>
        <div
          {...getRootProps()}
          className={`cursor-pointer border-dashed border-2 rounded-lg p-8 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <ImagePlus className="size-10 text-muted-foreground" />
          <p className={`text-sm ${isDragActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
            {isDragActive
              ? "Solta las fotos aquí"
              : "Arrastra fotos aquí o haz click para seleccionar"
            }
          </p>
        </div>
      </div>

      {allPreviews.length > 0 && (
        <div className="space-y-2">
          <Label>
            {allPreviews.length} {allPreviews.length === 1 ? "foto" : "fotos"} seleccionadas
          </Label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allPreviews.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {allPreviews.map((preview, index) => (
                  <SortablePhoto
                    key={preview.id}
                    preview={preview}
                    index={index}
                    onRemove={() => {
                      if (preview.type === "url") {
                        onExistingPhotoRemoved(index)
                      } else {
                        onFileRemoved(preview.fileIndex ?? (index - existingPhotos.length))
                      }
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="videoUrl">URL del video</Label>
          <Input
            id="videoUrl"
            {...register("videoUrl")}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="virtualTourUrl">URL del tour virtual</Label>
          <Input
            id="virtualTourUrl"
            {...register("virtualTourUrl")}
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  )
}
