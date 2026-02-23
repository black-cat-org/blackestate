"use client"

import { useRouter } from "next/navigation"
import { usePropertyForm } from "@/hooks/use-property-form"
import { PropertyFormNav } from "./property-form-nav"
import { BasicDataStep } from "./steps/basic-data-step"
import { LocationStep } from "./steps/location-step"
import { FeaturesStep } from "./steps/features-step"
import { MediaStep } from "./steps/media-step"
import { SummaryStep } from "./steps/summary-step"
import { createProperty } from "@/lib/data/properties"
import { toast } from "sonner"
import type { PropertyFormData } from "@/lib/types/property"

export function PropertyFormWizard() {
  const router = useRouter()
  const { form, currentStep, goToNextStep, goToPreviousStep, goToStep, totalSteps } =
    usePropertyForm()

  const handleSave = async () => {
    const values = form.getValues()
    try {
      await createProperty(values as PropertyFormData)
      toast.success("Propiedad guardada como borrador")
      router.push("/dashboard/properties")
    } catch {
      toast.error("Error al guardar la propiedad")
    }
  }

  const steps = [
    <BasicDataStep key="basic" form={form} />,
    <LocationStep key="location" form={form} />,
    <FeaturesStep key="features" form={form} />,
    <MediaStep key="media" form={form} />,
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
        isLastStep={currentStep === totalSteps - 1}
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
            isLastStep
          />
        </div>
      )}
    </div>
  )
}
