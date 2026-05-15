import { z } from "zod"
import {
  DEAL_SOURCE_FORM_VALUES,
  DEAL_STAGE_CREATE_VALUES,
} from "./_deal-enums"

// ---------------------------------------------------------------------------
// Shared enum tuples live in `_deal-enums.ts` so the promote-inquiry
// schema can reuse them — see that file for rationale on why the
// runtime guard is duplicated from the domain union.
// ---------------------------------------------------------------------------

const CONTACT_MODE_VALUES = ["existing", "new"] as const

// ---------------------------------------------------------------------------
// Create Deal form (dashboard agent path — manual creation, NOT the
// inquiry-promote flow which lives in `promote-inquiry-dialog.tsx`).
//
// The dual-mode contact resolution mirrors `inquiryCreateFormSchema`
// (lib/validations/inquiry.ts): a `contactMode` discriminator carried
// in the form state lets `superRefine` validate only the active
// branch and prevents error leak across tab switches.
//
// Field rationale:
//   - `stage` defaults to `'visit_scheduled'` (matches the action
//     layer / use case default).
//   - `expectedCloseAt` is a `YYYY-MM-DD` date string (HTML `<input
//     type="date">`); the DTO stores it as `string` so the format
//     passes through unchanged to the mapper.
//   - `wantsOffers` is a boolean (Checkbox); defaults to false at
//     the mapper boundary.
//   - The "advanced" fields (`budget`, `propertyTypeSought`,
//     `zoneOfInterest`, `wantsOffers`, `expectedCloseAt`) live in a
//     collapsible section in the dialog UI but are validated here
//     regardless — the schema does not know about UI affordances.
// ---------------------------------------------------------------------------

const YYYYMMDD_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const dealCreateFormSchema = z
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
    // Restricted to non-terminal stages on the create path. Creating a
    // Deal directly in `won` or `lost` would land it in the archive
    // without ever passing through the Kanban — semantically incoherent
    // and a confusing UX (the agent creates the Deal then can't find
    // it). Moving a Deal to terminal is the job of the Kanban drag
    // flow / `moveDealStageAction`, not the create dialog.
    stage: z.enum(DEAL_STAGE_CREATE_VALUES),
    source: z
      .enum(DEAL_SOURCE_FORM_VALUES)
      .optional()
      .or(z.literal("")),
    message: z
      .string()
      .max(2000, "El mensaje no puede exceder 2000 caracteres")
      .optional()
      .or(z.literal("")),
    budget: z
      .string()
      .max(120, "El presupuesto no puede exceder 120 caracteres")
      .optional()
      .or(z.literal("")),
    propertyTypeSought: z
      .string()
      .max(120, "El tipo buscado no puede exceder 120 caracteres")
      .optional()
      .or(z.literal("")),
    zoneOfInterest: z
      .string()
      .max(200, "La zona no puede exceder 200 caracteres")
      .optional()
      .or(z.literal("")),
    wantsOffers: z.boolean(),
    expectedCloseAt: z
      .string()
      .regex(YYYYMMDD_REGEX, "Fecha inválida")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
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

export type DealCreateFormValues = z.infer<typeof dealCreateFormSchema>

// ---------------------------------------------------------------------------
// Edit Deal form (R27 detail page).
//
// Intentionally narrower than the create schema — `contactId`,
// `contactDraft`, `propertyId`, and `stage` are NOT editable here:
//   - Contact + property changes mean a different Deal (create a new one)
//   - Stage transitions go through `moveDealStageAction`, NOT the
//     generic update path, because the Kanban depends on `stage_order`
//     recompaction + `closed_at` / `lost_reason` side-effects that
//     `IDealRepository.moveStage` owns
// ---------------------------------------------------------------------------

export const dealEditFormSchema = z.object({
  source: z
    .enum(DEAL_SOURCE_FORM_VALUES)
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .max(2000, "El mensaje no puede exceder 2000 caracteres")
    .optional()
    .or(z.literal("")),
  budget: z
    .string()
    .max(120, "El presupuesto no puede exceder 120 caracteres")
    .optional()
    .or(z.literal("")),
  propertyTypeSought: z
    .string()
    .max(120, "El tipo buscado no puede exceder 120 caracteres")
    .optional()
    .or(z.literal("")),
  zoneOfInterest: z
    .string()
    .max(200, "La zona no puede exceder 200 caracteres")
    .optional()
    .or(z.literal("")),
  wantsOffers: z.boolean(),
  expectedCloseAt: z
    .string()
    .regex(YYYYMMDD_REGEX, "Fecha inválida")
    .optional()
    .or(z.literal("")),
})

export type DealEditFormValues = z.infer<typeof dealEditFormSchema>

// ---------------------------------------------------------------------------
// Lost Deal form (R27 lost-deal-dialog).
//
// Captures the optional `lostReason` text. Submission triggers a
// single atomic call: `moveDealStageAction(id, { toStage: 'lost',
// lostReason })`. The repository writes `stage`, `closed_at = now()`
// and `lost_reason` in one UPDATE inside a single transaction — no
// race window between "reason saved" and "stage flipped". See
// `MoveDealStageInput.lostReason` in
// `features/deals/domain/deal.repository.ts` for the full contract.
// ---------------------------------------------------------------------------

export const lostDealFormSchema = z.object({
  lostReason: z
    .string()
    .max(2000, "El motivo no puede exceder 2000 caracteres")
    .optional()
    .or(z.literal("")),
})

export type LostDealFormValues = z.infer<typeof lostDealFormSchema>
