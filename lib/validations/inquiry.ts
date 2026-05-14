import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared enum literals (kept inline; importing the domain union from
// `features/inquiries/domain/inquiry.entity` would create a presentation
// ↔ domain coupling the validation layer does not need — Zod's `z.enum`
// is the runtime guard, and the domain union enforces compile-time
// alignment via the action layer's typed DTOs.
// ---------------------------------------------------------------------------

const INQUIRY_SOURCE_FORM_VALUES = [
  "public_form",
  "bot",
  "manual",
  "whatsapp",
  "facebook",
  "instagram",
  "tiktok",
  "google",
  "referral",
  "direct",
] as const

const DEAL_STAGE_FORM_VALUES = [
  "visit_scheduled",
  "negotiation",
  "reserved",
  "won",
  "lost",
] as const

const DEAL_SOURCE_FORM_VALUES = [
  "facebook",
  "instagram",
  "whatsapp",
  "tiktok",
  "google",
  "referral",
  "direct",
] as const

// ---------------------------------------------------------------------------
// Create Inquiry form (dashboard agent path — distinct from the public
// /p/[id] form which has its own narrower schema in `public-inquiry.ts`).
// ---------------------------------------------------------------------------
//
// Two contact-resolution modes mirror `CreateInquiryDTO`:
//   - `contactId` — agent picked an existing Contact via contact-autocomplete
//   - `contactDraftName` / `contactDraftPhone` / `contactDraftEmail` —
//     agent typed new contact details inline
// Exactly one mode must produce a usable value; `superRefine` enforces
// the constraint with field-targeted error messages so react-hook-form
// surfaces the message under the right input.
//
// `propertyId` is always required — an Inquiry without a Property would
// fail the DB NOT NULL FK.

/**
 * Active contact-resolution tab. Carried in the form state so the
 * Zod `superRefine` knows which branch of fields to validate — without
 * this discriminator, errors leak across tabs (a stale phone-required
 * error from the "Nuevo" tab would persist in `form.formState.errors`
 * after switching to "Existente", and re-surface on the next return to
 * "Nuevo"). The dialog keeps the same value in `useState<ContactMode>`
 * for UI rendering and syncs both via `form.setValue` on tab change.
 */
const CONTACT_MODE_VALUES = ["existing", "new"] as const

export const inquiryCreateFormSchema = z
  .object({
    contactMode: z.enum(CONTACT_MODE_VALUES),
    contactId: z.string().optional().or(z.literal("")),
    contactDraftName: z
      .string()
      .max(120, "El nombre no puede exceder 120 caracteres")
      .optional()
      .or(z.literal("")),
    contactDraftPhone: z
      .string()
      .max(40, "El teléfono no puede exceder 40 caracteres")
      .optional()
      .or(z.literal("")),
    contactDraftEmail: z
      .string()
      .max(254, "El correo no puede exceder 254 caracteres")
      .email("Correo inválido")
      .optional()
      .or(z.literal("")),
    propertyId: z.string().min(1, "Selecciona una propiedad"),
    source: z
      .enum(INQUIRY_SOURCE_FORM_VALUES)
      .optional()
      .or(z.literal("")),
    message: z
      .string()
      .max(2000, "El mensaje no puede exceder 2000 caracteres")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Validate only the fields that belong to the currently active
    // tab. Errors against the inactive tab's inputs would render in
    // hidden DOM nodes and then bleed into the user's view on tab
    // switch — see the reviewer note in the I9 review.
    if (data.contactMode === "existing") {
      if (!data.contactId || data.contactId.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona un contacto",
          path: ["contactId"],
        })
      }
      return
    }

    const draftName = data.contactDraftName?.trim() ?? ""
    const draftPhone = data.contactDraftPhone?.trim() ?? ""
    const draftEmail = data.contactDraftEmail?.trim() ?? ""

    if (draftName.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa el nombre del contacto",
        path: ["contactDraftName"],
      })
    }
    if (!draftPhone && !draftEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos un teléfono o un correo",
        path: ["contactDraftPhone"],
      })
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos un teléfono o un correo",
        path: ["contactDraftEmail"],
      })
    }
  })

export type InquiryCreateFormValues = z.infer<typeof inquiryCreateFormSchema>

// ---------------------------------------------------------------------------
// Promote Inquiry → Deal form. Captures the MINIMUM set per the UX
// decision (decision #2 in the I9 propuesta): agents promote rapidly
// when scheduling a visit and don't yet have budget/zone/etc. Those
// fields are filled in later via the Deal detail screen.
//
// Only `stage` + `source` + `message` here; the rest of
// `PromoteInquiryDealInput` stays default-undefined and is editable on
// the resulting Deal.
// ---------------------------------------------------------------------------

export const promoteInquiryFormSchema = z.object({
  stage: z
    .enum(DEAL_STAGE_FORM_VALUES)
    .optional()
    .or(z.literal("")),
  source: z
    .enum(DEAL_SOURCE_FORM_VALUES)
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .max(2000, "El mensaje no puede exceder 2000 caracteres")
    .optional()
    .or(z.literal("")),
})

export type PromoteInquiryFormValues = z.infer<typeof promoteInquiryFormSchema>

// ---------------------------------------------------------------------------
// Discard Inquiry form. Reason is intentionally optional (plan §4 +
// `discarded_reason` is nullable at the DB) so the agent can quickly
// move forward without writing busy-work text — the placeholder
// suggests useful free-form context.
// ---------------------------------------------------------------------------

export const discardInquiryFormSchema = z.object({
  reason: z
    .string()
    .max(1000, "El motivo no puede exceder 1000 caracteres")
    .optional()
    .or(z.literal("")),
})

export type DiscardInquiryFormValues = z.infer<typeof discardInquiryFormSchema>
