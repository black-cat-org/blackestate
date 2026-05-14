import { and, desc, eq, ilike, isNotNull, isNull, sql } from "drizzle-orm"

import {
  mapCreateDTOToInsert as mapDealCreateToInsert,
  mapDealRowToEntity,
} from "@/features/deals/infrastructure/deal.mapper"
import type {
  CreateDealDTO,
  Deal,
  DealStage,
} from "@/features/deals/domain/deal.entity"
import type {
  Inquiry,
  InquirySource,
  InquiryStatus,
  UpdateInquiryDTO,
} from "@/features/inquiries/domain/inquiry.entity"
import type {
  FindInquiriesOptions,
  IInquiryRepository,
  PromoteInquiryDealInput,
  ResolvedCreateInquiryDTO,
} from "@/features/inquiries/domain/inquiry.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { contact, deal, inquiry, properties } from "@/lib/db/schema"

import {
  mapCreateDTOToInsert as mapInquiryCreateToInsert,
  mapPartialDTOToUpdate as mapInquiryPartialToUpdate,
  mapInquiryRowToEntity,
  mapInquiryRowWithJoinsToEntity,
} from "./inquiry.mapper"

/**
 * Drizzle implementation of `IInquiryRepository`. Every query goes
 * through `withRLS(ctx, ...)` and carries an explicit
 * `eq(inquiry.organizationId, ctx.orgId)` predicate — defense-in-depth
 * per CLAUDE.md's "Multitenancy — Zero Tolerance" rule. The class never
 * reads from the raw `db` pool directly.
 *
 * Throw tokens (lowercase snake_case for stable mapping at the action /
 * UI layer, matching the contract documented in `IInquiryRepository`):
 *   - `inquiry_not_found`        — id missing or hidden by RLS
 *   - `inquiry_not_open`         — discarded / promoted already
 *   - `deal_already_active`      — promote conflicts with the active-deal
 *                                  partial UNIQUE on (org, contact, property)
 *   - `inquiry_already_restored` — restore() called on an active row
 *   - `inquiry_no_permission`    — defensive fallback in restore()
 */
export class DrizzleInquiryRepository implements IInquiryRepository {
  // ---------------------------------------------------------------------------
  // Reads — list endpoints with contact + property + (promoted) deal joins
  // ---------------------------------------------------------------------------

  async findAll(
    ctx: SessionContext,
    options: FindInquiriesOptions = {},
  ): Promise<Inquiry[]> {
    const filters = buildFindFilters(options)
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedInquiry)
        .from(inquiry)
        .leftJoin(contact, eq(inquiry.contactId, contact.id))
        .leftJoin(properties, eq(inquiry.propertyId, properties.id))
        .leftJoin(deal, eq(inquiry.promotedDealId, deal.id))
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            isNull(inquiry.deletedAt),
            ...filters,
          ),
        )
        .orderBy(desc(inquiry.updatedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findAllOpen(ctx: SessionContext): Promise<Inquiry[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedInquiry)
        .from(inquiry)
        .leftJoin(contact, eq(inquiry.contactId, contact.id))
        .leftJoin(properties, eq(inquiry.propertyId, properties.id))
        .leftJoin(deal, eq(inquiry.promotedDealId, deal.id))
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            isNull(inquiry.deletedAt),
            eq(inquiry.status, "open"),
          ),
        )
        // Freshest expressed interest first — distinct sort from `findAll`,
        // see contract JSDoc.
        .orderBy(desc(inquiry.createdAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findAllArchived(ctx: SessionContext): Promise<Inquiry[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedInquiry)
        .from(inquiry)
        .leftJoin(contact, eq(inquiry.contactId, contact.id))
        .leftJoin(properties, eq(inquiry.propertyId, properties.id))
        .leftJoin(deal, eq(inquiry.promotedDealId, deal.id))
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            isNull(inquiry.deletedAt),
            // `status IN ('discarded','promoted')` — Postgres array idiom
            // via Drizzle's `sql` template keeps the WHERE flat and the
            // enum type-safe.
            sql`${inquiry.status} IN ('discarded','promoted')`,
          ),
        )
        .orderBy(desc(inquiry.updatedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findAllDeleted(ctx: SessionContext): Promise<Inquiry[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedInquiry)
        .from(inquiry)
        .leftJoin(contact, eq(inquiry.contactId, contact.id))
        .leftJoin(properties, eq(inquiry.propertyId, properties.id))
        .leftJoin(deal, eq(inquiry.promotedDealId, deal.id))
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            isNotNull(inquiry.deletedAt),
          ),
        )
        .orderBy(desc(inquiry.deletedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findById(
    ctx: SessionContext,
    id: string,
  ): Promise<Inquiry | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedInquiry)
        .from(inquiry)
        .leftJoin(contact, eq(inquiry.contactId, contact.id))
        .leftJoin(properties, eq(inquiry.propertyId, properties.id))
        .leftJoin(deal, eq(inquiry.promotedDealId, deal.id))
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, id),
            isNull(inquiry.deletedAt),
          ),
        )
        .limit(1),
    )
    return rows[0] ? mapJoinedRow(rows[0]) : undefined
  }

  async findByContactId(
    ctx: SessionContext,
    contactId: string,
  ): Promise<Inquiry[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedInquiry)
        .from(inquiry)
        .leftJoin(contact, eq(inquiry.contactId, contact.id))
        .leftJoin(properties, eq(inquiry.propertyId, properties.id))
        .leftJoin(deal, eq(inquiry.promotedDealId, deal.id))
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.contactId, contactId),
            isNull(inquiry.deletedAt),
          ),
        )
        .orderBy(desc(inquiry.updatedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findByPropertyId(
    ctx: SessionContext,
    propertyId: string,
  ): Promise<Inquiry[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedInquiry)
        .from(inquiry)
        .leftJoin(contact, eq(inquiry.contactId, contact.id))
        .leftJoin(properties, eq(inquiry.propertyId, properties.id))
        .leftJoin(deal, eq(inquiry.promotedDealId, deal.id))
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.propertyId, propertyId),
            isNull(inquiry.deletedAt),
          ),
        )
        .orderBy(desc(inquiry.updatedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findOpenByContactAndProperty(
    ctx: SessionContext,
    contactId: string,
    propertyId: string,
  ): Promise<Inquiry | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(inquiry)
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.contactId, contactId),
            eq(inquiry.propertyId, propertyId),
            eq(inquiry.status, "open"),
            isNull(inquiry.deletedAt),
          ),
        )
        .limit(1),
    )
    return rows[0] ? mapInquiryRowToEntity(rows[0]) : undefined
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  async create(
    ctx: SessionContext,
    data: ResolvedCreateInquiryDTO,
  ): Promise<Inquiry> {
    // The mapper now accepts the minimum shape both `CreateInquiryDTO`
    // and `ResolvedCreateInquiryDTO` satisfy (propertyId/source/message
    // via Pick) — no cast needed. See I5 mapper JSDoc.
    const insert = mapInquiryCreateToInsert(data, ctx, data.contactId)
    const rows = await withRLS(ctx, (tx) =>
      tx.insert(inquiry).values(insert).returning(),
    )
    return mapInquiryRowToEntity(rows[0])
  }

  async update(
    ctx: SessionContext,
    id: string,
    data: UpdateInquiryDTO,
  ): Promise<Inquiry> {
    const updateData = mapInquiryPartialToUpdate(data)
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(inquiry)
        .set(updateData)
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, id),
            isNull(inquiry.deletedAt),
          ),
        )
        .returning(),
    )
    if (rows.length === 0) throw new Error("inquiry_not_found")
    return mapInquiryRowToEntity(rows[0])
  }

  async discard(
    ctx: SessionContext,
    id: string,
    reason?: string,
  ): Promise<Inquiry> {
    return withRLS(ctx, async (tx) => {
      // SELECT FOR UPDATE locks the inquiry row inside the transaction
      // so a concurrent `discard()` / `promote()` / `update()` cannot
      // change `status` between this check and the UPDATE below. Without
      // the lock, two concurrent discards on the same open inquiry both
      // pass the `status === 'open'` check and both UPDATE — the second
      // call silently returns success for a no-op that should be a
      // domain error per the contract.
      const found = await tx
        .select({ status: inquiry.status })
        .from(inquiry)
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, id),
            isNull(inquiry.deletedAt),
          ),
        )
        .for("update")
        .limit(1)
      if (found.length === 0) throw new Error("inquiry_not_found")
      if (found[0].status !== "open") throw new Error("inquiry_not_open")

      const rows = await tx
        .update(inquiry)
        .set({
          status: "discarded",
          discardedReason: reason ?? null,
        })
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, id),
            // Defense-in-depth status guard: even if the FOR UPDATE
            // lock were somehow released, this WHERE makes the UPDATE
            // a no-op against a non-open row. Belt + suspenders against
            // the TOCTOU race the lock already prevents.
            eq(inquiry.status, "open"),
          ),
        )
        .returning()
      // UPDATE can only fail here if the row's RLS policy denies the
      // mutation while SELECT allowed the read, or if the status
      // changed between the locked SELECT and the UPDATE (impossible
      // under SERIALIZABLE-like semantics inside the lock). Surface as
      // not-found so the caller does not leak existence.
      if (rows.length === 0) throw new Error("inquiry_not_found")
      return mapInquiryRowToEntity(rows[0])
    })
  }

  // ---------------------------------------------------------------------------
  // promote() — atomic two-row transaction
  // ---------------------------------------------------------------------------

  async promote(
    ctx: SessionContext,
    inquiryId: string,
    dealInput: PromoteInquiryDealInput,
  ): Promise<{ deal: Deal; inquiry: Inquiry }> {
    return withRLS(ctx, async (tx) => {
      // 1. Lock the inquiry row. `FOR UPDATE` prevents two concurrent
      //    promote() calls from both passing the status check before
      //    either UPDATE lands.
      const locked = await tx
        .select()
        .from(inquiry)
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, inquiryId),
            isNull(inquiry.deletedAt),
          ),
        )
        .for("update")
        .limit(1)

      if (locked.length === 0) throw new Error("inquiry_not_found")
      const inq = locked[0]
      if (inq.status !== "open") throw new Error("inquiry_not_open")

      // 2. Compute `stageOrder = MAX(deal.stageOrder) + 1` for the target
      //    stage in the caller's org. The equality match on `targetStage`
      //    already isolates the right bucket — terminal rows
      //    (`won`/`lost`) cannot leak in because the caller's
      //    `targetStage` is always an active stage (`visit_scheduled` by
      //    default, never won/lost on promote per the contract). The
      //    `isNull(deletedAt)` filter excludes soft-deleted deals whose
      //    stage_order is meaningless on the live Kanban.
      const targetStage: DealStage = dealInput.stage ?? "visit_scheduled"
      const maxRows = await tx
        .select({
          maxOrder: sql<number>`coalesce(max(${deal.stageOrder}), -1)::int`,
        })
        .from(deal)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.stage, targetStage),
            isNull(deal.deletedAt),
          ),
        )
      const nextStageOrder = (maxRows[0]?.maxOrder ?? -1) + 1

      // 3. INSERT the Deal. The Deal inherits identity from the locked
      //    Inquiry, never from the input — see contract step 3.
      const fullCreate: CreateDealDTO = {
        ...dealInput,
        propertyId: inq.propertyId,
        inquiryId,
      }
      const dealInsert = mapDealCreateToInsert(
        fullCreate,
        ctx,
        inq.contactId,
        nextStageOrder,
      )

      let insertedDeal
      try {
        const dealRows = await tx.insert(deal).values(dealInsert).returning()
        insertedDeal = dealRows[0]
      } catch (error) {
        // Postgres unique_violation (`23505`) raised by the partial
        // UNIQUE `deal_unique_active_contact_property` from migration
        // 026. Re-raise as a domain token so the caller can surface
        // "this contact already has an active deal on this property"
        // instead of leaking the raw PG error.
        if (isUniqueViolation(error)) {
          throw new Error("deal_already_active")
        }
        throw error
      }

      // 4. Close the bidirectional invariant on the Inquiry side.
      const updatedInquiry = await tx
        .update(inquiry)
        .set({
          status: "promoted",
          promotedDealId: insertedDeal.id,
        })
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, inquiryId),
          ),
        )
        .returning()

      // Defensive: the FOR UPDATE lock + the explicit `id` WHERE should
      // guarantee a row update. An empty rowset here means the lock was
      // released between step 1 and step 4 — Postgres semantics make
      // that impossible inside the same transaction, so this branch is
      // unreachable in practice. Throw a distinct token so monitoring
      // can flag the impossible state if it ever fires.
      if (updatedInquiry.length === 0) throw new Error("inquiry_not_found")

      return {
        deal: mapDealRowToEntity(insertedDeal),
        inquiry: mapInquiryRowToEntity(updatedInquiry[0]),
      }
    })
  }

  // ---------------------------------------------------------------------------
  // softDelete / restore — std pattern (mirrors contact / lead)
  // ---------------------------------------------------------------------------

  async softDelete(ctx: SessionContext, id: string): Promise<void> {
    const isSuperAdminAction = ctx.isSuperAdmin === true
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(inquiry)
        .set({
          deletedAt: new Date(),
          deletedByUserId: isSuperAdminAction ? null : ctx.userId,
          deletedByUserName: isSuperAdminAction ? null : ctx.userName,
          deletedByUserEmail: isSuperAdminAction ? null : ctx.email,
        })
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, id),
            isNull(inquiry.deletedAt),
          ),
        )
        .returning({ id: inquiry.id }),
    )
    if (rows.length === 0) throw new Error("inquiry_not_found")
  }

  async restore(ctx: SessionContext, id: string): Promise<Inquiry> {
    return withRLS(ctx, async (tx) => {
      const rows = await tx
        .update(inquiry)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          deletedByUserName: null,
          deletedByUserEmail: null,
        })
        .where(
          and(
            eq(inquiry.organizationId, ctx.orgId),
            eq(inquiry.id, id),
            isNotNull(inquiry.deletedAt),
          ),
        )
        .returning()

      if (rows.length > 0) return mapInquiryRowToEntity(rows[0])

      const existing = await tx
        .select({ id: inquiry.id, deletedAt: inquiry.deletedAt })
        .from(inquiry)
        .where(
          and(eq(inquiry.organizationId, ctx.orgId), eq(inquiry.id, id)),
        )
        .limit(1)

      if (existing.length === 0) throw new Error("inquiry_not_found")
      if (existing[0].deletedAt === null) {
        throw new Error("inquiry_already_restored")
      }
      throw new Error("inquiry_no_permission")
    })
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const selectJoinedInquiry = {
  inquiry,
  contactName: contact.name,
  contactPhone: contact.phone,
  contactEmail: contact.email,
  propertyTitle: properties.title,
  promotedDealStage: deal.stage,
}

type JoinedInquiryRow = {
  inquiry: typeof inquiry.$inferSelect
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  propertyTitle: string | null
  promotedDealStage: DealStage | null
}

// Compile-time key parity guard. If a column is added or removed in
// `selectJoinedInquiry` without the corresponding update to
// `JoinedInquiryRow`, tsc errors on one of the two assignments below.
// Drizzle does not auto-propagate the inferred row shape from a
// module-scoped const select — this is the manual equivalent.
type _KeysOfSelect = keyof typeof selectJoinedInquiry
type _KeysOfRow = keyof JoinedInquiryRow
// Both directions: every select key must exist in row, and vice versa.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _selectKeysInRow: Record<_KeysOfSelect, true> = {
  inquiry: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  propertyTitle: true,
  promotedDealStage: true,
} satisfies Record<_KeysOfRow, true>

function mapJoinedRow(row: JoinedInquiryRow): Inquiry {
  return mapInquiryRowWithJoinsToEntity(row.inquiry, {
    contactName: row.contactName ?? undefined,
    contactPhone: row.contactPhone ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    propertyTitle: row.propertyTitle ?? undefined,
    promotedDealStage: row.promotedDealStage ?? undefined,
  })
}

function buildFindFilters(options: FindInquiriesOptions) {
  const filters = []

  // `"all"` is the UI sentinel for "no filter on this field" — collapse
  // it to the same WHERE as `undefined`.
  if (options.status && options.status !== "all") {
    filters.push(eq(inquiry.status, options.status as InquiryStatus))
  }
  if (options.source && options.source !== "all") {
    filters.push(eq(inquiry.source, options.source as InquirySource))
  }
  if (options.propertyId) {
    filters.push(eq(inquiry.propertyId, options.propertyId))
  }
  if (options.search) {
    const trimmed = options.search.trim()
    if (trimmed.length > 0) {
      filters.push(ilike(inquiry.message, `%${trimmed}%`))
    }
  }

  return filters
}

/**
 * Detects the Postgres `unique_violation` (`23505`) error code across the
 * realistic wrapper shapes:
 *   - Raw `pg` `DatabaseError` — `.code` at top level
 *   - Drizzle wrapper — `.cause.code`
 *   - Drizzle wrapping a pool/queue layer that re-wraps the pg error —
 *     `.cause.cause.code`
 *
 * Three depth levels cover every nesting the project's runtime path
 * (`drizzle-orm/node-postgres` over the `pg` Pool) is known to produce.
 * If the underlying driver ever changes and an unmapped chain depth
 * appears, the raw error propagates to the caller (a server 500) — that
 * is a louder failure mode than silently mis-mapping to a domain token.
 */
function isUniqueViolation(error: unknown): boolean {
  const codeAt = (level: unknown): string | undefined => {
    if (!level || typeof level !== "object") return undefined
    const code = (level as { code?: unknown }).code
    return typeof code === "string" ? code : undefined
  }
  if (codeAt(error) === "23505") return true
  const cause = (error as { cause?: unknown } | null | undefined)?.cause
  if (codeAt(cause) === "23505") return true
  const cause2 = (cause as { cause?: unknown } | null | undefined)?.cause
  if (codeAt(cause2) === "23505") return true
  return false
}
