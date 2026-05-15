import { z } from "zod"

// ---------------------------------------------------------------------------
// Dashboard agent-side appointment create/edit.
//
// Validation rules:
// - dealId + propertyId required (FK, NOT NULL on DB — R34 switched
//   the appointment FK from leads → deal; see drizzle/sql/027)
// - date in YYYY-MM-DD (HTML date input native format)
// - time + endTime in HH:mm (HTML time input native format)
// - endTime must be strictly after time on the same day
// - notes optional, capped at 1000 chars to prevent abuse
//
// Empty strings are kept as-is to match react-hook-form input types;
// normalisation happens in the submit handler before calling the action.
// ---------------------------------------------------------------------------

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const YYYYMMDD_REGEX = /^\d{4}-\d{2}-\d{2}$/

const baseFields = {
  dealId: z.string().min(1, "Selecciona un negocio"),
  propertyId: z.string().min(1, "Selecciona una propiedad"),
  date: z
    .string()
    .min(1, "Selecciona una fecha")
    .regex(YYYYMMDD_REGEX, "Fecha inválida"),
  time: z
    .string()
    .min(1, "Selecciona la hora de inicio")
    .regex(HHMM_REGEX, "Hora inválida"),
  endTime: z
    .string()
    .min(1, "Selecciona la hora de fin")
    .regex(HHMM_REGEX, "Hora inválida"),
  notes: z.string().max(1000, "Las notas no pueden exceder 1000 caracteres").optional(),
}

const refineEndAfterStart = (
  data: { time: string; endTime: string },
  ctx: z.RefinementCtx,
) => {
  if (!HHMM_REGEX.test(data.time) || !HHMM_REGEX.test(data.endTime)) return
  if (data.endTime <= data.time) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["endTime"],
    })
  }
}

export const appointmentCreateSchema = z
  .object(baseFields)
  .superRefine(refineEndAfterStart)

export type AppointmentCreateValues = z.infer<typeof appointmentCreateSchema>

// Edit shape: dealId/propertyId locked (cannot move appointment to another
// deal/property — that would lose the original audit trail). Only date/time
// /notes are editable. Status changes go through their own action
// (updateAppointmentStatusAction) wired to Kanban transitions.
export const appointmentEditSchema = z
  .object({
    date: baseFields.date,
    time: baseFields.time,
    endTime: baseFields.endTime,
    notes: baseFields.notes,
  })
  .superRefine(refineEndAfterStart)

export type AppointmentEditValues = z.infer<typeof appointmentEditSchema>

// Partial update schema used at the Server Action boundary.
// All fields optional — superRefine is re-implemented to check endTime > time
// only when both are present in the payload (Zod .partial() cannot be used
// on schemas with refinements).
export const appointmentUpdateSchema = z
  .object({
    date: baseFields.date.optional(),
    time: baseFields.time.optional(),
    endTime: baseFields.endTime.optional(),
    notes: baseFields.notes,
  })
  .superRefine((data, ctx) => {
    if (data.time && data.endTime) {
      refineEndAfterStart({ time: data.time, endTime: data.endTime }, ctx)
    }
  })

export type AppointmentUpdateValues = z.infer<typeof appointmentUpdateSchema>
