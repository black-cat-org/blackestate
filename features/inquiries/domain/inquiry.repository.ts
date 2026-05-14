import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  CreateDealDTO,
  Deal,
} from "@/features/deals/domain/deal.entity"
import type {
  CreateInquiryDTO,
  Inquiry,
  InquiryFilters,
  UpdateInquiryDTO,
} from "./inquiry.entity"

/**
 * Internal create DTO consumed by the repository after the use case has
 * resolved the Contact. `contactId` is guaranteed to be a real id — either
 * an existing Contact matched by `findByPhoneOrEmail` dedup, or one
 * created just before via `contactRepo.create`. `contactDraft` is
 * intentionally excluded from this shape so the adapter cannot act on
 * stale draft data left over from the public `CreateInquiryDTO`.
 *
 * Mirrors the same pattern as `ResolvedCreateDealDTO` from
 * `features/deals/domain/deal.repository.ts`. The `createInquiryUseCase`
 * (I7) is responsible for the find-or-create step before composing this.
 */
export interface ResolvedCreateInquiryDTO
  extends Omit<CreateInquiryDTO, "contactId" | "contactDraft"> {
  contactId: string
}

/**
 * Fields the agent / bot supplies when promoting an Inquiry into a Deal.
 * `contactId`, `propertyId`, and `inquiryId` are NOT part of this shape:
 *   - `contactId` and `propertyId` come from the Inquiry being promoted
 *     (the adapter reads them inside the same transaction).
 *   - `inquiryId` is set automatically by the adapter to the id of the
 *     Inquiry being promoted.
 *   - `contactDraft` is meaningless here — by the time you promote an
 *     Inquiry, the Contact is already resolved.
 *
 * Everything else from `CreateDealDTO` survives because the promotion
 * is the canonical moment to capture deal-specific fields (stage if
 * known, expected close date, etc.).
 */
export type PromoteInquiryDealInput = Omit<
  CreateDealDTO,
  "contactId" | "contactDraft" | "propertyId" | "inquiryId"
>

/**
 * Optional filter shape accepted by `findAll`. Mirrors the entity-level
 * `InquiryFilters` but with fields the adapter actually queries against.
 * Defaults: when omitted entirely, `findAll` returns every non-soft-deleted
 * Inquiry the caller's RLS allows them to see.
 */
export interface FindInquiriesOptions {
  status?: InquiryFilters["status"]
  source?: InquiryFilters["source"]
  propertyId?: string
  /** Free-text search against `message` (ILIKE %query%). Trimmed; empty/whitespace → ignored. */
  search?: string
}

export interface IInquiryRepository {
  /**
   * List every non-soft-deleted Inquiry the caller's RLS context allows
   * them to see, optionally narrowed by filters. Ordered by `updated_at DESC`.
   *
   * The `"all"` sentinel for `status` / `source` is treated as "no filter
   * on this field" by the adapter — both the entity sentinel `"all"` and
   * `undefined` collapse to the same SQL.
   */
  findAll(ctx: SessionContext, options?: FindInquiriesOptions): Promise<Inquiry[]>

  /**
   * Open Inquiries — `status = 'open'`, soft-deleted excluded.
   *
   * This is the hot-path read for: the dashboard default view, the
   * pending-inquiries sidebar badge, and the "Active inquiries" section
   * of the contact detail page. Ordered by `created_at DESC` so the
   * freshest expressed interest surfaces first — distinct from `findAll`,
   * which is sorted by `updated_at DESC` because it is a general-purpose
   * list where the agent cares about last activity, not capture date.
   *
   * NOT a thin alias of `findAll({ status: 'open' })`: the two methods
   * intentionally differ in their `ORDER BY` to match their respective
   * UX semantics. Kept as a dedicated method so the call site expresses
   * intent and the adapter can pick a sort-aligned index.
   */
  findAllOpen(ctx: SessionContext): Promise<Inquiry[]>

  /**
   * Inquiries with `status IN ('discarded','promoted')` — the archive view.
   * Soft-deleted excluded. Ordered by `updated_at DESC` so the most
   * recently closed surfaces first (mirrors `findAll`'s sort key — both
   * are last-activity views).
   */
  findAllArchived(ctx: SessionContext): Promise<Inquiry[]>

  /**
   * Soft-deleted Inquiries (trash view). Ordered by `deleted_at DESC`.
   */
  findAllDeleted(ctx: SessionContext): Promise<Inquiry[]>

  /** Fetch a single Inquiry by id, excluding soft-deleted rows. */
  findById(ctx: SessionContext, id: string): Promise<Inquiry | undefined>

  /**
   * All Inquiries belonging to a single Contact, including discarded and
   * promoted — powers the "Inquiries" section of the contact detail page.
   * Soft-deleted excluded. Ordered by `updated_at DESC`.
   */
  findByContactId(ctx: SessionContext, contactId: string): Promise<Inquiry[]>

  /**
   * All Inquiries associated with a single Property — powers the
   * "Who expressed interest in this property?" view on the property detail
   * page. Soft-deleted excluded. Ordered by `updated_at DESC`.
   *
   * Includes discarded and promoted Inquiries on purpose: a Property's
   * historical interest is a useful signal for analytics (e.g. "Casa A
   * got 12 inquiries this quarter, 3 converted to Deals").
   */
  findByPropertyId(ctx: SessionContext, propertyId: string): Promise<Inquiry[]>

  /**
   * Find the open (non-discarded, non-promoted, non-deleted) Inquiry for
   * a given Contact+Property pair, if any.
   *
   * Used by `createInquiryUseCase` to detect duplicates BEFORE inserting:
   * the unique constraint at the DB level
   * `(orgId, contactId, propertyId) WHERE deletedAt IS NULL AND status='open'`
   * enforces this, but querying first lets the use case reactivate the
   * existing row (when the source / message updates) instead of surfacing
   * a constraint violation to the caller.
   *
   * Discarded or promoted Inquiries on the same pair do NOT block a new
   * `open` Inquiry — they represent past interest.
   */
  findOpenByContactAndProperty(
    ctx: SessionContext,
    contactId: string,
    propertyId: string,
  ): Promise<Inquiry | undefined>

  /**
   * Insert a new Inquiry. The caller (use case) MUST resolve the Contact
   * first and pass a {@link ResolvedCreateInquiryDTO} with `contactId`
   * populated — the repository does not accept `contactDraft` and will
   * not perform find-or-create on the contact.
   *
   * New Inquiries are always inserted with `status = 'open'` (the DB
   * default). Discard and promote are separate operations.
   */
  create(ctx: SessionContext, data: ResolvedCreateInquiryDTO): Promise<Inquiry>

  /**
   * Patch an existing Inquiry. Only `source` and `message` are mutable
   * through this path (see `UpdateInquiryDTO` JSDoc for the rationale).
   * Lifecycle transitions go through `discard` / `promote` / `softDelete`.
   */
  update(
    ctx: SessionContext,
    id: string,
    data: UpdateInquiryDTO,
  ): Promise<Inquiry>

  /**
   * Move the Inquiry to `status = 'discarded'`. Records the optional
   * `reason` on `discarded_reason` for funnel analysis.
   *
   * Throws `inquiry_not_found` if the id does not exist or RLS hides it.
   * Throws `inquiry_not_open` if the current status is anything other than
   * `'open'` — discarding a promoted or already-discarded Inquiry is not
   * meaningful and surfaces as a domain error instead of silently no-op'ing.
   *
   * Soft-delete is not affected by this operation — the Inquiry remains
   * visible in the archived list until `softDelete` is invoked separately.
   */
  discard(
    ctx: SessionContext,
    id: string,
    reason?: string,
  ): Promise<Inquiry>

  /**
   * **Atomic promotion of an Inquiry into a Deal.** The repository is the
   * single owner of this operation because it is the only place that can
   * guarantee the bidirectional invariant
   * `inquiry.promoted_deal_id = deal.id AND deal.inquiry_id = inquiry.id`
   * across two rows in two tables without a window of inconsistency.
   *
   * The adapter wraps the whole sequence in a single `withRLS` transaction:
   *
   *   1. `SELECT * FROM inquiry WHERE id = :inquiryId AND deleted_at IS NULL FOR UPDATE`
   *      — locks the row, surfaces `inquiry_not_found` if missing.
   *   2. Verify `status = 'open'` — throws `inquiry_not_open` otherwise.
   *      Promoting an already-promoted or discarded Inquiry is a domain
   *      error, not a silent reuse.
   *   3. `INSERT INTO deal (..., contact_id, property_id, inquiry_id)
   *      VALUES (..., inquiry.contact_id, inquiry.property_id, :inquiryId)`
   *      — the Deal inherits identity from the Inquiry, NOT from the input.
   *   4. `UPDATE inquiry SET status = 'promoted', promoted_deal_id = :dealId
   *      WHERE id = :inquiryId` — closes the invariant.
   *   5. COMMIT.
   *
   * RLS posture: the transaction runs under `withRLS(ctx, ...)`, so both
   * the INSERT (Deal) and the UPDATE (Inquiry) are subject to their
   * respective policies — agent can only promote an Inquiry they are
   * allowed to update, and the resulting Deal is INSERTed against the
   * Deal INSERT policy in the same role. Defense-in-depth: every WHERE
   * clause also pins `organization_id = ctx.orgId` explicitly so a
   * spoofed JWT cannot promote across orgs even if RLS were misconfigured.
   *
   * Idempotency / concurrency: the `FOR UPDATE` lock combined with the
   * `status = 'open'` check guarantees that two concurrent calls cannot
   * both succeed — the second sees the Inquiry already `promoted` and
   * throws `inquiry_not_open`. Caller catches and decides whether to
   * surface the already-existing Deal or treat as error.
   *
   * Returns both rows in their post-transaction state so the caller can
   * render "Created Deal X from Inquiry Y" without a second roundtrip.
   *
   * Throws (string tokens for stable mapping at the action / UI layer):
   *   - `"inquiry_not_found"` — id missing or hidden by RLS.
   *   - `"inquiry_not_open"` — already promoted or discarded.
   *   - `"deal_already_active"` — the Contact already has a non-terminal
   *     Deal on the same Property (unique partial constraint on the Deal
   *     table: `(orgId, contactId, propertyId) WHERE deleted_at IS NULL
   *     AND stage NOT IN ('won','lost')`). The adapter catches the
   *     Postgres `23505` unique-violation raised by step 3 and rethrows
   *     this token so the caller can surface a domain-level message
   *     ("Ya existe un Negocio activo para este contacto en esta
   *     propiedad — ábrelo antes de crear uno nuevo") and deep-link to
   *     the existing Deal instead of leaking the raw PG error.
   */
  promote(
    ctx: SessionContext,
    inquiryId: string,
    dealInput: PromoteInquiryDealInput,
  ): Promise<{ deal: Deal; inquiry: Inquiry }>

  softDelete(ctx: SessionContext, id: string): Promise<void>
  restore(ctx: SessionContext, id: string): Promise<Inquiry>
}
