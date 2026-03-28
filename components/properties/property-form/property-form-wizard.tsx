"use client"

import { useRouter } from "next/navigation"
import { usePropertyForm } from "@/hooks/use-property-form"
import { PropertyFormNav } from "./property-form-nav"
import { BasicDataStep } from "./steps/basic-data-step"
import { LocationStep } from "./steps/location-step"
import { FeaturesStep } from "./steps/features-step"
import { MediaStep } from "./steps/media-step"
import { DescriptionStep } from "./steps/description-step"
import { SummaryStep } from "./steps/summary-step"
import { createProperty, updateProperty } from "@/lib/data/properties"
import { toast } from "sonner"
import type { PropertyFormData, Property } from "@/lib/types/property"

interface PropertyFormWizardProps {
  propertyId?: string
  initialData?: PropertyFormData
}

export function PropertyFormWizard({ propertyId, initialData }: PropertyFormWizardProps) {
  const router = useRouter()
  const isEditing = !!propertyId
  const { form, currentStep, goToNextStep, goToPreviousStep, goToStep, totalSteps } =
    usePropertyForm(initialData)

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
    rooms: values.rooms ? Number(values.rooms) : undefined,
    bedrooms: values.bedrooms ? Number(values.bedrooms) : undefined,
    bathrooms: values.bathrooms ? Number(values.bathrooms) : undefined,
    garages: values.garages ? Number(values.garages) : undefined,
    age: values.age ? Number(values.age) : undefined,
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

  const handleSave = async () => {
    const values = form.getValues()
    try {
      if (isEditing) {
        await updateProperty(propertyId, { ...buildPropertyData(values), status: "pausada" })
        toast.success("Propiedad guardada como borrador")
        router.push(`/dashboard/properties/${propertyId}`)
      } else {
        const property = await createProperty(values as PropertyFormData)
        await updateProperty(property.id, { status: "pausada" })
        toast.success("Propiedad guardada como borrador")
        router.push("/dashboard/properties")
      }
    } catch {
      toast.error("Error al guardar la propiedad")
    }
  }

  const handlePublish = async () => {
    const values = form.getValues()
    try {
      if (isEditing) {
        await updateProperty(propertyId, { ...buildPropertyData(values), status: "activa" })
        toast.success("Propiedad publicada")
        router.push(`/dashboard/properties/${propertyId}`)
      } else {
        const property = await createProperty(values as PropertyFormData)
        await updateProperty(property.id, { status: "activa" })
        toast.success("Propiedad publicada")
        router.push("/dashboard/properties")
      }
    } catch {
      toast.error("Error al publicar la propiedad")
    }
  }

  const steps = [
    <BasicDataStep key="basic" form={form} />,
    <LocationStep key="location" form={form} />,
    <FeaturesStep key="features" form={form} />,
    <MediaStep key="media" form={form} />,
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
          />
        </div>
      )}
    </div>
  )
}
