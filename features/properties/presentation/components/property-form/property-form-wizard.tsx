"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePropertyForm } from "@/hooks/use-property-form"
import { PropertyFormNav } from "./property-form-nav"
import { BasicDataStep } from "./steps/basic-data-step"
import { LocationStep } from "./steps/location-step"
import { FeaturesStep } from "./steps/features-step"
import { MediaStep, type PhotoPreview } from "./steps/media-step"
import { DescriptionStep } from "./steps/description-step"
import { SummaryStep } from "./steps/summary-step"
import { createPropertyAction, updatePropertyAction } from "@/features/properties/presentation/actions"
import { uploadPropertyMediaAction } from "@/features/properties/presentation/storage-actions"
import { toast } from "sonner"
import type { PropertyFormData, Property } from "@/features/properties/domain/property.entity"

interface PropertyFormWizardProps {
  propertyId?: string
  initialData?: PropertyFormData
}

export function PropertyFormWizard({ propertyId, initialData }: PropertyFormWizardProps) {
  const router = useRouter()
  const isEditing = !!propertyId
  const { form, currentStep, goToNextStep, goToPreviousStep, goToStep, totalSteps } =
    usePropertyForm(initialData)

  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState<"paused" | "active" | false>(false)

  const handleFilesAdded = (files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files])
  }

  const handleFileRemoved = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleExistingPhotoRemoved = (index: number) => {
    const current = form.getValues("photos")
    form.setValue("photos", current.filter((_, i) => i !== index))
  }

  const handleReorder = (reordered: PhotoPreview[]) => {
    const newExistingPhotos: string[] = []
    const newPendingFiles: File[] = []

    for (const item of reordered) {
      if (item.type === "url") {
        newExistingPhotos.push(item.src)
      } else if (item.fileIndex !== undefined) {
        newPendingFiles.push(pendingFiles[item.fileIndex])
      }
    }

    form.setValue("photos", newExistingPhotos)
    setPendingFiles(newPendingFiles)
  }

  const buildPropertyData = (values: PropertyFormData): Partial<Property> => ({
    title: values.title,
    description: values.description,
    shortDescription: values.shortDescription || undefined,
    type: values.type as Property["type"],
    operationType: values.operationType as Property["operationType"],
    price: { amount: Number(values.price), currency: values.currency },
    negotiable: values.negotiable,
    expenses: values.expenses ? { amount: Number(values.expenses), currency: values.expensesCurrency } : undefined,
    address: {
      street: values.street,
      number: values.number || undefined,
      floor: values.floor || undefined,
      apartment: values.apartment || undefined,
      city: values.city,
      state: values.state,
      country: values.country,
      neighborhood: values.neighborhood || undefined,
      lat: values.lat ? Number(values.lat) : undefined,
      lng: values.lng ? Number(values.lng) : undefined,
      googleMapsUrl: values.googleMapsUrl || undefined,
    },
    totalArea: values.totalArea ? { value: Number(values.totalArea), unit: values.surfaceUnit } : undefined,
    coveredArea: values.coveredArea ? { value: Number(values.coveredArea), unit: values.surfaceUnit } : undefined,
    rooms: values.rooms !== "" && values.rooms !== undefined ? Number(values.rooms) : undefined,
    bedrooms: values.bedrooms !== "" && values.bedrooms !== undefined ? Number(values.bedrooms) : undefined,
    bathrooms: values.bathrooms !== "" && values.bathrooms !== undefined ? Number(values.bathrooms) : undefined,
    garages: values.garages !== "" && values.garages !== undefined ? Number(values.garages) : undefined,
    age: values.age !== "" && values.age !== undefined ? Number(values.age) : undefined,
    condition: (values.condition as Property["condition"]) || undefined,
    orientation: (values.orientation as Property["orientation"]) || undefined,
    amenities: values.amenities,
    hideExactLocation: values.hideExactLocation,
    media: {
      photos: values.photos,
      videoUrl: values.videoUrl || undefined,
      virtualTourUrl: values.virtualTourUrl || undefined,
      blueprints: values.blueprints,
    },
  })

  async function uploadPendingPhotos(targetPropertyId: string): Promise<string[]> {
    if (pendingFiles.length === 0) return []

    const formData = new FormData()
    for (const file of pendingFiles) {
      formData.append("files", file)
    }

    return uploadPropertyMediaAction(targetPropertyId, formData)
  }

  const handleSubmit = async (status: "paused" | "active") => {
    const values = form.getValues()
    setSubmitting(status)

    try {
      if (isEditing) {
        const uploadedUrls = await uploadPendingPhotos(propertyId)
        const allPhotos = [...values.photos, ...uploadedUrls]

        await updatePropertyAction(propertyId, {
          ...buildPropertyData(values),
          status,
          media: {
            photos: allPhotos,
            videoUrl: values.videoUrl || undefined,
            virtualTourUrl: values.virtualTourUrl || undefined,
            blueprints: values.blueprints,
          },
        })

        toast.success(status === "active" ? "Propiedad publicada" : "Propiedad guardada como borrador")
        router.push(`/dashboard/properties/${propertyId}`)
      } else {
        let property: Property | undefined
        try {
          property = await createPropertyAction(values as PropertyFormData)
          const uploadedUrls = await uploadPendingPhotos(property.id)

          await updatePropertyAction(property.id, {
            status,
            media: {
              photos: [...values.photos, ...uploadedUrls],
              videoUrl: values.videoUrl || undefined,
              virtualTourUrl: values.virtualTourUrl || undefined,
              blueprints: values.blueprints,
            },
          })

          toast.success(status === "active" ? "Propiedad publicada" : "Propiedad guardada como borrador")
          router.push("/dashboard/properties")
        } catch {
          if (property) {
            toast.error("La propiedad se guardó pero hubo un error al subir las fotos. Puedes reintentar desde la edición.")
            router.push(`/dashboard/properties/${property.id}/edit`)
          } else {
            toast.error("Error al guardar la propiedad")
          }
          return
        }
      }
    } catch {
      toast.error(status === "active" ? "Error al publicar la propiedad" : "Error al guardar la propiedad")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSave = () => handleSubmit("paused")
  const handlePublish = () => handleSubmit("active")

  const steps = [
    <BasicDataStep key="basic" form={form} />,
    <LocationStep key="location" form={form} />,
    <FeaturesStep key="features" form={form} />,
    <MediaStep
      key="media"
      form={form}
      pendingFiles={pendingFiles}
      onFilesAdded={handleFilesAdded}
      onFileRemoved={handleFileRemoved}
      onExistingPhotoRemoved={handleExistingPhotoRemoved}
      onReorder={handleReorder}
    />,
    <DescriptionStep key="description" form={form} />,
    <SummaryStep key="summary" form={form} onGoToStep={goToStep} />,
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PropertyFormNav
        currentStep={currentStep}
        onGoToStep={goToStep}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        onSave={handleSave}
        onPublish={handlePublish}
        isLastStep={currentStep === totalSteps - 1}
        saveLabel={isEditing ? "Guardar cambios" : "Guardar como borrador"}
        submitting={submitting}
      />
      <div className="rounded-lg border p-6">{steps[currentStep]}</div>
      {currentStep === totalSteps - 1 && (
        <div className="flex justify-end">
          <PropertyFormNav
            currentStep={currentStep}
            onGoToStep={goToStep}
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
            onSave={handleSave}
            onPublish={handlePublish}
            isLastStep
            saveLabel={isEditing ? "Guardar cambios" : "Guardar como borrador"}
            submitting={submitting}
          />
        </div>
      )}
    </div>
  )
}
