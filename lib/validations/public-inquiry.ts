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
export const publicInquiryFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
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
    message: z
      .string()
      .max(2000, "El mensaje no puede exceder 2000 caracteres")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.phone?.trim() && !data.email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos un teléfono o un correo",
        path: ["phone"],
      })
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos un teléfono o un correo",
        path: ["email"],
      })
    }
  })

export type PublicInquiryFormValues = z.infer<typeof publicInquiryFormSchema>
