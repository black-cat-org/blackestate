import { z } from "zod"

export const leadFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(8, "Ingresa un teléfono válido"),
  email: z.string().email("Ingresa un email válido"),
  message: z.string().optional(),
  propertyTypeSought: z.string().optional(),
  budget: z.string().optional(),
  zoneOfInterest: z.string().optional(),
  wantsOffers: z.boolean(),
})

export type LeadFormValues = z.infer<typeof leadFormSchema>
