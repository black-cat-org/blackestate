"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { WIZARD_STEPS } from "@/lib/constants/property"

interface PropertyFormNavProps {
  currentStep: number
  onGoToStep: (step: number) => void
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  isLastStep: boolean
  saveLabel?: string
}

export function PropertyFormNav({
  currentStep,
  onGoToStep,
  onPrevious,
  onNext,
  onSave,
  isLastStep,
  saveLabel = "Guardar como borrador",
}: PropertyFormNavProps) {
  return (
    <div className="space-y-6">
      <nav className="flex items-center justify-center">
        <ol className="flex items-center gap-2">
          {WIZARD_STEPS.map((step, index) => (
            <li key={step.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onGoToStep(index)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <Check className="size-4" />
                ) : (
                  <span className="flex size-5 items-center justify-center rounded-full text-xs">
                    {step.id}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-6",
                    index < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 0}
        >
          Anterior
        </Button>
        {isLastStep ? (
          <Button type="button" onClick={onSave}>
            {saveLabel}
          </Button>
        ) : (
          <Button type="button" onClick={onNext}>
            Siguiente
          </Button>
        )}
      </div>
    </div>
  )
}
