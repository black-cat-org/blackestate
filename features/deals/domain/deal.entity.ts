import type { CreateContactDTO } from "@/features/contacts/domain/contact.entity"

/**
 * Funnel stages a Deal moves through. The order in this union mirrors the
 * left-to-right order of the Kanban board columns and the canonical
 * progression of a real estate sales cycle.
 *
 * Only 5 stages — the Deal model represents real commercial commitment
 * (cita agendada, negociación, reserva, cierre). The earlier "interest
 * without commitment" states (prospect, qualified) live on the separate
 * `Inquiry` entity (`features/inquiries/domain/inquiry.entity.ts`); a
 * Deal is created when an Inquiry gets promoted (e.g. when the contact
 * schedules a visit).
 *
 * `won` and `lost` are terminal stages: the Deal exits the active Kanban
 * board and lands in an archived view. Reopening a closed Deal (moving
 * it back to `negotiation` etc.) is supported — the adapter clears
 * `closedAt` and `lostReason` when that happens.
 *
 * The `deal_stage_enum` Postgres type is the source of truth at the DB
 * boundary; this union must stay in sync (R10 migration).
 */
export type DealStage =
  | "visit_scheduled"
  | "negotiation"
  | "reserved"
  | "won"
  | "lost"

/**
 * Where the Deal originated. Mirrors `deal_source_enum` at the DB boundary.
 * Renamed from the legacy `lead_source_enum`.
 */
export type DealSource =
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "tiktok"
  | "google"
  | "referral"
  | "direct"

/**
 * A Deal represents the commercial opportunity that connects a Contact to a
 * Property — the unit of work for the agent. Distinct from the Contact
 * (the person identity, which persists across many Deals) and from the
 * Property (the listing itself).
 *
 * A single Contact can have N Deals (one per Property of interest). Each
 * Deal independently moves through the funnel via `stage` and is ordered
 * within its column via `stageOrder` to support Kanban drag-and-drop.
 *
 * Unique constraint at the DB layer: `(organizationId, contactId, propertyId)`
 * where `deletedAt IS NULL AND stage NOT IN ('won','lost')`. A Contact can
 * only have one active Deal per Property at a time. After a Deal closes
 * (won or lost), a new Deal can be created on the same Contact+Property
 * pair to represent a fresh opportunity.
 */
export interface Deal {
  id: string
  createdByUserId: string
  contactId: string
  propertyId: string
  /**
   * Link to the Inquiry that originated this Deal, when applicable.
   * Most Deals are created by promoting an Inquiry (visit scheduled,
   * direct negotiation). A Deal can also be created directly without
   * a prior Inquiry — e.g. the agent registers an opportunity captured
   * off-platform — in which case `inquiryId` is `undefined`.
   */
  inquiryId?: string
  stage: DealStage
  stageOrder: number
  source?: DealSource
  budget?: string
  message?: string
  propertyTypeSought?: string
  zoneOfInterest?: string
  wantsOffers: boolean

  /** Agent-estimated date for the Deal to reach `won` or `lost`. Used by forecasting. */
  expectedCloseAt?: string

  /** Set automatically by the adapter when `stage` transitions to `won` or `lost`. Cleared on reopen. */
  closedAt?: string

  /** Free-text reason captured when a Deal is marked `lost`. Optional in the contract — the UI may require it. */
  lostReason?: string

  createdAt: string
  updatedAt: string
  deletedAt?: string
  deletedBy?: {
    userId?: string
    userName?: string
    userEmail?: string
  }

  // Derived / joined fields populated by infrastructure queries when the
  // consumer needs them (Kanban card, Deal detail page, exported reports).
  // List endpoints that do not need them leave each undefined.
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  propertyTitle?: string
}

/**
 * Payload to create a new Deal. The Contact resolution is intentionally
 * dual-mode to support the primary UX flow (Deal creation dialog with
 * embedded contact autocomplete + inline "create new" fallback):
 *
 *   - `contactId` — the agent picked an existing Contact in the autocomplete.
 *   - `contactDraft` — the agent entered new Contact details inline. The
 *     `create-deal` use case is responsible for calling find-or-create on
 *     the Contact repo before inserting the Deal.
 *
 * Exactly one of the two must be provided; the use case throws otherwise.
 *
 * `stage` is optional and defaults to `prospect` at the use-case boundary.
 * `stageOrder` is NOT part of this DTO: the adapter computes it as
 * `MAX(stageOrder) + 1` for the target stage in the caller's org so the
 * new Deal lands at the bottom of its Kanban column.
 */
export interface CreateDealDTO {
  contactId?: string
  contactDraft?: CreateContactDTO
  /**
   * Link to the Inquiry that originated this Deal, when applicable.
   * Set when an Inquiry is being promoted to a Deal (the common path
   * via `promoteInquiry` flow). Left undefined when the agent creates
   * a Deal directly without a prior Inquiry.
   */
  inquiryId?: string
  propertyId: string
  /** Defaults to `'visit_scheduled'` at the use-case boundary when omitted — the typical entry point is "an inquiry was promoted because a visit got scheduled". */
  stage?: DealStage
  source?: DealSource
  budget?: string
  message?: string
  propertyTypeSought?: string
  zoneOfInterest?: string
  /** Defaults to `false` at the mapper boundary when omitted (mirrors the `tags?` default-empty pattern in `CreateContactDTO`). */
  wantsOffers?: boolean
  expectedCloseAt?: string
}

/**
 * Patch shape for updating an existing Deal. `contactId` is intentionally
 * NOT updatable here: changing the Contact on an existing Deal is a
 * different operation (Deal reassignment between contacts) that needs its
 * own use case if/when it becomes a product requirement. `contactDraft`
 * is excluded for the same reason.
 *
 * Stage transitions are also expressible through this DTO, but the Kanban
 * UI uses dedicated `moveDealStage` and `reorderDealsInStage` server
 * actions for clarity and to keep the optimistic-update + revalidate flow
 * separate from generic edit operations.
 */
export type UpdateDealDTO = Partial<Omit<CreateDealDTO, "contactId" | "contactDraft">>

/**
 * Filters for the Deal list / Kanban view. `stage` and `source` carry an
 * `"all"` sentinel to match the existing `PropertyFilters` pattern (lets
 * UI components treat "no filter" as a real selectable option).
 */
export interface DealFilters {
  search: string
  stage: DealStage | "all"
  source: DealSource | "all"
  /**
   * Optional unlike the other filter fields: when omitted, Deals across
   * every property in the org are returned. `propertyId` is a drill-down
   * filter (used from the property detail page to see "all deals for this
   * property"), not part of the default Kanban filter state — so it has
   * no `"all"` sentinel and stays undefined when not applied.
   */
  propertyId?: string
}
