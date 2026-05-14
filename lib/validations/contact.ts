import { z } from "zod"

// ---------------------------------------------------------------------------
// Contact create/edit form.
//
// Form-input semantics (matches existing `appointment.ts` convention):
//   - Empty strings stay as `""` inside the resolved values; the submit
//     handler at the call site normalises them via `nullable()` before
//     calling the action. This keeps inputs controlled in
//     react-hook-form without splitting the type union with `undefined`.
//   - `phone` accepts any free-text the agent types; canonical
//     normalisation happens at the mapper boundary (the partial UNIQUE
//     indexes from migration 026 are matched against the canonical
//     stored form, not the input form).
//   - `email` is validated as RFC 5322 shape when present; empty is
//     allowed because contacts may have only a phone.
//   - `tags` enters as a comma-separated string (`"vip, urgent"`) — the
//     submit handler at the call site splits + trims + filters empties
//     before sending the array DTO. Keeping the input string lets
//     react-hook-form work with a regular `Input` element without a
//     bespoke chip primitive.
//   - `preferredChannel` is optional; the empty-string sentinel `""`
//     models "not selected" because a native `Select` cannot bind to
//     `undefined`.
// ---------------------------------------------------------------------------

export const PREFERRED_CHANNEL_FORM_VALUES = ["whatsapp", "phone", "email"] as const

export const contactFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "El nombre es obligatorio")
      .max(120, "El nombre no puede exceder 120 caracteres"),
    phone: z
      .string()
      .max(40, "El teléfono no puede exceder 40 caracteres")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .max(254, "El correo no puede exceder 254 caracteres")
      .email("Correo inválido")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .max(2000, "Las notas no pueden exceder 2000 caracteres")
      .optional()
      .or(z.literal("")),
    tags: z
      .string()
      .max(500, "Las etiquetas no pueden exceder 500 caracteres")
      .optional()
      .or(z.literal("")),
    preferredChannel: z
      .enum(PREFERRED_CHANNEL_FORM_VALUES)
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.phone?.trim() && !data.email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes ingresar al menos un teléfono o un correo",
        path: ["phone"],
      })
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes ingresar al menos un teléfono o un correo",
        path: ["email"],
      })
    }
  })

export type ContactFormValues = z.infer<typeof contactFormSchema>

/**
 * Parse the comma-separated `tags` input into the canonical `string[]`
 * shape the DTO expects. Trims each token and drops empties so trailing
 * commas, extra spaces, or duplicated separators are no-ops.
 *
 * Lives next to the schema (not in the dialog component) so future
 * surfaces that bind the same field (bulk-edit, CSV import) share the
 * same parsing rule.
 */
export function parseTagsInput(raw: string | undefined): string[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((token) => token.trim())
        .filter((token) => token.length > 0),
    ),
  )
}

/**
 * Reverse of {@link parseTagsInput}. Used when initialising the form
 * from an existing `Contact.tags` array (edit mode).
 */
export function serializeTagsInput(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return ""
  return tags.join(", ")
}
