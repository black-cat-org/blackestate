import { z } from "zod"

/**
 * Public-form Inquiry shape submitted from `/p/[id]` by an
 * unauthenticated visitor.
 *
 * Narrower than the auth `contactFormSchema`: the public surface only
 * captures the minimum to open an Inquiry — name, contact method, and
 * an optional free-text message. Qualification fields
 * (`propertyTypeSought`, `budget`, `zoneOfInterest`, `wantsOffers`)
 * that the legacy lead form carried have moved to the `Deal` entity
 * (created by the agent when the Inquiry gets promoted), so capturing
 * them on the public form would just feed them into a column that no
 * longer exists on Inquiry.
 *
 * Boundary semantics (matches existing public-form behaviour):
 *   - `name` is required (≥ 2 chars after trim).
 *   - Exactly one of `phone` / `email` is required — the
 *     `contact_missing_phone_and_email` constraint in
 *     `drizzle/sql/028_public_create_inquiry_rpc.sql` enforces the same
 *     invariant at the DB; this schema fails earlier with a
 *     user-friendly Spanish message so the visitor never sees a raw
 *     RPC token.
 *   - `phone` allows any free-text shape; the RPC canonicalises to
 *     `[0-9+]` only for dedup matching.
 *   - `email` validates RFC 5322 shape when present.
 */
/**
 * Optional free-text field: empty strings (the form's `defaultValues`)
 * are accepted at the input boundary and normalised to `undefined` at
 * the output. This keeps the inferred runtime type aligned with what
 * react-hook-form actually passes from a controlled input (always a
 * string) while letting the server action treat absent values as
 * `undefined` and coalesce to `null` for the RPC.
 */
const optionalText = (max: number, maxMessage: string) =>
  z
    .string()
    .max(max, maxMessage)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" || value === undefined ? undefined : value))

export const publicInquiryFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(120, "El nombre no puede exceder 120 caracteres"),
    phone: optionalText(40, "El teléfono no puede exceder 40 caracteres"),
    email: z
      .string()
      .max(254, "El correo no puede exceder 254 caracteres")
      .email("Correo inválido")
      .optional()
      .or(z.literal(""))
      .transform((value) => (value === "" || value === undefined ? undefined : value)),
    message: optionalText(2000, "El mensaje no puede exceder 2000 caracteres"),
  })
  .superRefine((data, ctx) => {
    if (!data.phone?.trim() && !data.email?.trim()) {
      // Single issue attached to `phone` only. Attaching it to `email`
      // too would be dead output: when the user typed an invalid email
      // (the email field already carries its own `"Correo inválido"`)
      // shadcn's `FormMessage` renders only the first error per field
      // and silently drops this one. The actionable suggestion ("at
      // least one of phone OR email") only needs to surface once.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos un teléfono o un correo",
        path: ["phone"],
      })
    }
  })

/**
 * Input type — what the form holds in state before resolver parses.
 * Includes the `""` defaults so react-hook-form's `defaultValues` are
 * type-compatible with controlled inputs.
 */
export type PublicInquiryFormValues = z.input<typeof publicInquiryFormSchema>
