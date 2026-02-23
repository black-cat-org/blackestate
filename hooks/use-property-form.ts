"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { PropertyFormData } from "@/lib/types/property"

const basicDataSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  type: z.string().min(1, "Selecciona un tipo de propiedad"),
  operationType: z.string().min(1, "Selecciona un tipo de operación"),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  currency: z.string(),
  expenses: z.union([z.coerce.number().nonnegative(), z.literal("")]).optional(),
  expensesCurrency: z.string(),
})

const locationSchema = z.object({
  street: z.string().min(1, "La calle es obligatoria"),
  number: z.string().min(1, "El número es obligatorio"),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().min(1, "La ciudad es obligatoria"),
  state: z.string().min(1, "La provincia es obligatoria"),
  country: z.string().min(1, "El país es obligatorio"),
  neighborhood: z.string().optional(),
  zipCode: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
})

const featuresSchema = z.object({
  totalArea: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
  coveredArea: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
  surfaceUnit: z.string(),
  rooms: z.union([z.coerce.number().int().nonnegative(), z.literal("")]).optional(),
  bedrooms: z.union([z.coerce.number().int().nonnegative(), z.literal("")]).optional(),
  bathrooms: z.union([z.coerce.number().int().nonnegative(), z.literal("")]).optional(),
  garages: z.union([z.coerce.number().int().nonnegative(), z.literal("")]).optional(),
  age: z.union([z.coerce.number().int().nonnegative(), z.literal("")]).optional(),
  condition: z.string().optional(),
  orientation: z.string().optional(),
  amenities: z.array(z.string()),
})

const mediaSchema = z.object({
  photos: z.array(z.string()),
  videoUrl: z.string().optional(),
  virtualTourUrl: z.string().optional(),
  blueprints: z.array(z.string()),
  documents: z.array(z.string()),
})

const stepSchemas = [basicDataSchema, locationSchema, featuresSchema, mediaSchema]

const defaultValues: PropertyFormData = {
  title: "",
  description: "",
  type: "",
  operationType: "",
  price: "",
  currency: "USD",
  expenses: "",
  expensesCurrency: "ARS",
  street: "",
  number: "",
  floor: "",
  apartment: "",
  city: "",
  state: "",
  country: "Argentina",
  neighborhood: "",
  zipCode: "",
  lat: "",
  lng: "",
  totalArea: "",
  coveredArea: "",
  surfaceUnit: "m2",
  rooms: "",
  bedrooms: "",
  bathrooms: "",
  garages: "",
  age: "",
  condition: "",
  orientation: "",
  amenities: [],
  photos: [],
  videoUrl: "",
  virtualTourUrl: "",
  blueprints: [],
  documents: [],
}

export function usePropertyForm() {
  const [currentStep, setCurrentStep] = useState(0)

  const form = useForm<PropertyFormData>({
    defaultValues,
    mode: "onTouched",
  })

  const goToNextStep = useCallback(() => {
    const schema = stepSchemas[currentStep]
    if (!schema) {
      setCurrentStep((s) => Math.min(s + 1, 4))
      return true
    }

    const values = form.getValues()
    const result = schema.safeParse(values)

    if (!result.success) {
      form.clearErrors()
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PropertyFormData
        form.setError(field, { type: "manual", message: issue.message })
      }
      return false
    }

    form.clearErrors()
    setCurrentStep((s) => Math.min(s + 1, 4))
    return true
  }, [currentStep, form])

  const goToPreviousStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  return {
    form,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    totalSteps: 5,
  }
}
