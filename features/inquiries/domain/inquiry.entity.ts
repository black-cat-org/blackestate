import type { CreateContactDTO } from "@/features/contacts/domain/contact.entity"
import type { DealStage } from "@/features/deals/domain/deal.entity"

/**
 * Lifecycle status of an Inquiry. No funnel — only three terminal-or-active
 * positions:
 *
 *   - `open`      — the inquiry is live; the agent / bot may still act on it.
 *   - `discarded` — the inquiry will not progress (lost interest, spam,
 *                   duplicate cleanup, etc.). Captured `discardedReason`
 *                   is optional but encouraged for funnel analysis.
 *   - `promoted`  — the inquiry was converted into a Deal via the atomic
 *                   `promoteInquiryUseCase`. The resulting deal id lives on
 *                   `promotedDealId` and stays there for historical
 *                   traceability even if the Deal is later soft-deleted.
 *
 * The `inquiry_status_enum` Postgres type is the source of truth at the DB
 * boundary; this union must stay in sync (R10 migration).
 */
export type InquiryStatus = "open" | "discarded" | "promoted"

/**
 * Channels through which an Inquiry can enter the system. Superset of
 * `DealSource`: includes `public_form`, `bot` and `manual` because those
 * are the capture surfaces specific to early interest (public landing
 * form, WhatsApp bot conversation, agent typing it in by hand). Deals
 * do not carry those values — they inherit the social-channel subset.
 */
export type InquirySource =
  | "public_form"
  | "bot"
  | "manual"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google"
  | "referral"
  | "direct"

/**
 * An Inquiry represents expressed interest from a Contact about a Property,
 * without yet committing to a commercial path. Distinct from a Deal (which
 * carries the funnel) and from a Contact (the person identity itself).
 *
 * A single Contact can hold many Inquiries — typically one per property
 * they ask about. When an Inquiry matures (a visit gets scheduled, the
 * agent moves to negotiation), it is **promoted** to a Deal through an
 * atomic two-row transaction that sets `status = 'promoted'` here and
 * inserts a Deal with `inquiry_id` back-linking to this row.
 *
 * Unique constraint at the DB layer: `(organizationId, contactId,
 * propertyId)` where `deletedAt IS NULL AND status = 'open'`. A Contact
 * can only have one *active* Inquiry per Property at a time. A second
 * mention of the same property by the same contact reactivates the
 * existing row instead of creating a duplicate. After an Inquiry has
 * been promoted or discarded, a new Inquiry can be created on the same
 * Contact+Property pair (it represents renewed interest).
 */
export interface Inquiry {
  id: string
  createdByUserId: string
  contactId: string
  propertyId: string
  source?: InquirySource
  message?: string
  status: InquiryStatus

  /**
   * Set atomically by `promoteInquiryUseCase` when `status` transitions to
   * `'promoted'`. **Guaranteed to be defined whenever `status === 'promoted'`,
   * and undefined in all other states** — treat it as `string` (not
   * `string | undefined`) after a status guard. Persists even if the
   * resulting Deal is later soft-deleted (historical traceability).
   *
   * The type leaves this optional because the TS structural model cannot
   * express the discriminated invariant without forcing every consumer of
   * `Inquiry` through a union narrowing. Same trade-off `Deal` makes with
   * `closedAt` / `lostReason`: optional in shape, invariant in lifecycle.
   */
  promotedDealId?: string

  /** Free-text reason captured when the agent / bot moves the inquiry to `discarded`. Optional in the contract — the UI may require it. */
  discardedReason?: string

  createdAt: string
  updatedAt: string
  deletedAt?: string
  // When `deletedBy` is present, the deleting user is identified by
  // `userId` — that field is never absent. `userName` / `userEmail` are
  // denormalised snapshots that may be missing for older soft-deletes
  // (pre soft-delete-audit migration). Mirror of the `Contact` entity
  // invariant tightened in R16 — encodes the actual shape the mapper
  // produces and prevents consumers from defensive checks on a value
  // that cannot be undefined here.
  deletedBy?: {
    userId: string
    userName?: string
    userEmail?: string
  }

  // Derived / joined fields populated by infrastructure queries when the
  // consumer needs them (inquiry list, contact detail page sub-section,
  // exported reports). Queries that do not need them leave each undefined.
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  propertyTitle?: string

  /**
   * When `status === 'promoted'`, the consumer may want to display the
   * current stage of the resulting Deal ("promoted, currently in
   * Negotiation"). Populated by infra queries that JOIN against `deal`;
   * left undefined when the consumer does not need it.
   */
  promotedDealStage?: DealStage
}

/**
 * Payload to create a new Inquiry. The Contact resolution is dual-mode
 * (mirrors `CreateDealDTO`) to support the primary capture surfaces:
 *
 *   - `contactId` — the form / bot already matched an existing Contact.
 *   - `contactDraft` — the inputs identify a new person; the use case is
 *     responsible for calling find-or-create on the Contact repo before
 *     inserting the Inquiry.
 *
 * Exactly one of the two must be provided; the use case throws otherwise.
 * The type does not make them mutually exclusive at the TS level so test
 * harnesses and edge flows are not blocked artificially.
 *
 * `status` is NOT part of this DTO: every Inquiry starts as `'open'` by
 * convention at the use-case boundary. Discarding or promoting happens
 * through dedicated operations (`discardInquiry`, `promoteInquiry`).
 */
export interface CreateInquiryDTO {
  contactId?: string
  contactDraft?: CreateContactDTO
  propertyId: string
  source?: InquirySource
  message?: string
}

/**
 * Patch shape for updating an existing Inquiry. Intentionally narrow:
 * `contactId`, `propertyId`, `status`, `promotedDealId` and the audit
 * columns are NOT updatable through this DTO.
 *
 *   - `contactId` / `propertyId` would change the entity's identity —
 *     not a valid edit; create a new Inquiry instead.
 *   - `status` and `promotedDealId` only move forward through dedicated
 *     operations (`discardInquiry`, `promoteInquiry`) which keep the
 *     bidirectional Inquiry ↔ Deal invariant atomic.
 */
export type UpdateInquiryDTO = Partial<
  Pick<CreateInquiryDTO, "source" | "message">
>

/**
 * Filters for the Inquiry list view. `status` and `source` carry an
 * `"all"` sentinel (consistent with `PropertyFilters` and `DealFilters`)
 * so UI components treat "no filter" as a real selectable option.
 */
export interface InquiryFilters {
  search: string
  status: InquiryStatus | "all"
  source: InquirySource | "all"
  /**
   * Drill-down filter (e.g. opened from the property detail page to see
   * "all inquiries on this property"). Stays undefined when not applied.
   */
  propertyId?: string
}
