/**
 * Shared Zod enum tuples for Deal-related form schemas.
 *
 * Both `lib/validations/deal.ts` (deal-create dialog) and
 * `lib/validations/inquiry.ts` (promote-inquiry dialog) validate the
 * same `DealStage` / `DealSource` union at the form boundary. Keeping
 * the tuples here is the single source of truth for the runtime
 * `z.enum(...)` lists across the validation layer — without it, adding
 * a new stage/source requires editing both files and missing one
 * creates a silent validation gap.
 *
 * NOT imported from `features/deals/domain/deal.entity`: the validation
 * layer is the boundary that decides which literal values to accept at
 * runtime; the domain union is the boundary that decides which values
 * the type system enforces at compile time. The two pin each other via
 * the action-layer DTOs (the form values flow into `CreateDealDTO` and
 * `PromoteInquiryDealInput`), and the TypeScript compiler errors if
 * they fall out of sync.
 *
 * Filename prefixed with `_` (Drizzle convention adapted to validation
 * layer) marks this as an internal shared constant — not exported from
 * a barrel, not meant for consumers outside `lib/validations/`.
 */

export const DEAL_STAGE_FORM_VALUES = [
  "visit_scheduled",
  "negotiation",
  "reserved",
  "won",
  "lost",
] as const

/**
 * Active (non-terminal) Deal stages — the subset of
 * {@link DEAL_STAGE_FORM_VALUES} that an agent can pick as the
 * **initial** stage when creating a Deal. Creating a Deal directly in
 * `won` or `lost` would land it in the archive without ever showing
 * on the Kanban — semantically incoherent for a "new deal" flow.
 *
 * Mirrors the `TERMINAL_DEAL_STAGES` constant in
 * `features/deals/domain/deal.entity.ts` by exclusion. Adding a new
 * terminal stage there requires updating this tuple here too —
 * intentional duplication kept tight via the manual cross-reference.
 */
export const DEAL_STAGE_CREATE_VALUES = [
  "visit_scheduled",
  "negotiation",
  "reserved",
] as const

export const DEAL_SOURCE_FORM_VALUES = [
  "facebook",
  "instagram",
  "whatsapp",
  "tiktok",
  "google",
  "referral",
  "direct",
] as const
