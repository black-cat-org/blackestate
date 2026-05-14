import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notInArray,
  sql,
} from "drizzle-orm"

import type {
  Deal,
  DealStage,
  UpdateDealDTO,
} from "@/features/deals/domain/deal.entity"
import type {
  IDealRepository,
  MoveDealStageInput,
  ResolvedCreateDealDTO,
} from "@/features/deals/domain/deal.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { contact, deal, properties } from "@/lib/db/schema"

import {
  mapCreateDTOToInsert,
  mapDealRowToEntity,
  mapDealRowWithJoinsToEntity,
  mapPartialDTOToUpdate,
} from "./deal.mapper"

const TERMINAL_STAGES: ReadonlyArray<DealStage> = ["won", "lost"]

/**
 * Drizzle implementation of `IDealRepository`. Mirror of the contact and
 * inquiry repositories: every query goes through `withRLS(ctx, ...)` and
 * carries an explicit `eq(deal.organizationId, ctx.orgId)` predicate
 * (CLAUDE.md multitenancy zero-tolerance).
 *
 * Throw tokens (lowercase_snake_case, consistent with I6 inquiry repo):
 *   - `deal_not_found`           — id missing or hidden by RLS
 *   - `deal_already_restored`    — restore() called on an active row
 *   - `deal_no_permission`       — defensive fallback in restore()
 *   - `reorder_ids_mismatch`     — reorderInStage() payload mismatch
 *                                  (count / set / unknown id)
 *   - `terminal_stage_reorder`   — reorderInStage() called on
 *                                  `won` / `lost` stage (no drag handle
 *                                  on the archive view; the agent should
 *                                  never reach this — distinct token so
 *                                  the action layer can flag it as a UI
 *                                  bug rather than a payload mismatch).
 */
export class DrizzleDealRepository implements IDealRepository {
  // ---------------------------------------------------------------------------
  // Reads — Kanban + archive + detail
  // ---------------------------------------------------------------------------

  async findAllActive(ctx: SessionContext): Promise<Deal[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedDeal)
        .from(deal)
        .leftJoin(contact, eq(deal.contactId, contact.id))
        .leftJoin(properties, eq(deal.propertyId, properties.id))
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            isNull(deal.deletedAt),
            notInArray(deal.stage, [...TERMINAL_STAGES]),
          ),
        )
        // Kanban order: column then position-in-column.
        .orderBy(asc(deal.stage), asc(deal.stageOrder)),
    )
    return rows.map(mapJoinedRow)
  }

  async findAllClosed(ctx: SessionContext): Promise<Deal[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedDeal)
        .from(deal)
        .leftJoin(contact, eq(deal.contactId, contact.id))
        .leftJoin(properties, eq(deal.propertyId, properties.id))
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            isNull(deal.deletedAt),
            inArray(deal.stage, [...TERMINAL_STAGES]),
          ),
        )
        // `closed_at DESC NULLS LAST` so a terminal row whose closed_at
        // is somehow null (shouldn't happen post-`moveStage`, but
        // defensive) falls to the bottom rather than poisoning the top
        // of the list.
        .orderBy(sql`${deal.closedAt} DESC NULLS LAST`),
    )
    return rows.map(mapJoinedRow)
  }

  async findAllDeleted(ctx: SessionContext): Promise<Deal[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedDeal)
        .from(deal)
        .leftJoin(contact, eq(deal.contactId, contact.id))
        .leftJoin(properties, eq(deal.propertyId, properties.id))
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            isNotNull(deal.deletedAt),
          ),
        )
        .orderBy(desc(deal.deletedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findById(
    ctx: SessionContext,
    id: string,
  ): Promise<Deal | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedDeal)
        .from(deal)
        .leftJoin(contact, eq(deal.contactId, contact.id))
        .leftJoin(properties, eq(deal.propertyId, properties.id))
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.id, id),
            isNull(deal.deletedAt),
          ),
        )
        .limit(1),
    )
    return rows[0] ? mapJoinedRow(rows[0]) : undefined
  }

  async findByContactId(
    ctx: SessionContext,
    contactId: string,
  ): Promise<Deal[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedDeal)
        .from(deal)
        .leftJoin(contact, eq(deal.contactId, contact.id))
        .leftJoin(properties, eq(deal.propertyId, properties.id))
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.contactId, contactId),
            isNull(deal.deletedAt),
          ),
        )
        .orderBy(desc(deal.updatedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findByPropertyId(
    ctx: SessionContext,
    propertyId: string,
  ): Promise<Deal[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedDeal)
        .from(deal)
        .leftJoin(contact, eq(deal.contactId, contact.id))
        .leftJoin(properties, eq(deal.propertyId, properties.id))
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.propertyId, propertyId),
            isNull(deal.deletedAt),
          ),
        )
        .orderBy(desc(deal.updatedAt)),
    )
    return rows.map(mapJoinedRow)
  }

  async findByStage(
    ctx: SessionContext,
    stage: DealStage,
  ): Promise<Deal[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select(selectJoinedDeal)
        .from(deal)
        .leftJoin(contact, eq(deal.contactId, contact.id))
        .leftJoin(properties, eq(deal.propertyId, properties.id))
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.stage, stage),
            isNull(deal.deletedAt),
          ),
        )
        .orderBy(asc(deal.stageOrder)),
    )
    return rows.map(mapJoinedRow)
  }

  async findActiveByContactAndProperty(
    ctx: SessionContext,
    contactId: string,
    propertyId: string,
  ): Promise<Deal | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(deal)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.contactId, contactId),
            eq(deal.propertyId, propertyId),
            isNull(deal.deletedAt),
            notInArray(deal.stage, [...TERMINAL_STAGES]),
          ),
        )
        .limit(1),
    )
    return rows[0] ? mapDealRowToEntity(rows[0]) : undefined
  }

  async maxStageOrder(
    ctx: SessionContext,
    stage: DealStage,
  ): Promise<number> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          max: sql<number>`coalesce(max(${deal.stageOrder}), -1)::int`,
        })
        .from(deal)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.stage, stage),
            isNull(deal.deletedAt),
          ),
        ),
    )
    return rows[0]?.max ?? -1
  }

  // ---------------------------------------------------------------------------
  // Mutations — create / update
  // ---------------------------------------------------------------------------

  async create(
    ctx: SessionContext,
    data: ResolvedCreateDealDTO,
  ): Promise<Deal> {
    return withRLS(ctx, async (tx) => {
      // The repo owns stage_order assignment so two concurrent creates
      // into the same column do not collide on insertion position. The
      // partial UNIQUE on `(org, contact, property)` already prevents
      // duplicate active deals on the same pair, so the only race surface
      // here is the stage_order index — which is cosmetic (Kanban
      // ordering), not a correctness invariant.
      const targetStage: DealStage = data.stage ?? "visit_scheduled"
      const maxRows = await tx
        .select({
          max: sql<number>`coalesce(max(${deal.stageOrder}), -1)::int`,
        })
        .from(deal)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.stage, targetStage),
            isNull(deal.deletedAt),
          ),
        )
      const stageOrder = (maxRows[0]?.max ?? -1) + 1

      // Mapper accepts the minimum DTO shape — both CreateDealDTO and
      // ResolvedCreateDealDTO satisfy it (structural typing widens the
      // optional `contactId` of the public DTO to the required string
      // here; the `contactDraft` field is optional on the public DTO
      // and absent here). No cast required.
      const insert = mapCreateDTOToInsert(data, ctx, data.contactId, stageOrder)
      const rows = await tx.insert(deal).values(insert).returning()
      return mapDealRowToEntity(rows[0])
    })
  }

  async update(
    ctx: SessionContext,
    id: string,
    data: UpdateDealDTO,
  ): Promise<Deal> {
    const updateData = mapPartialDTOToUpdate(data)
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(deal)
        .set(updateData)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.id, id),
            isNull(deal.deletedAt),
          ),
        )
        .returning(),
    )
    if (rows.length === 0) throw new Error("deal_not_found")
    return mapDealRowToEntity(rows[0])
  }

  // ---------------------------------------------------------------------------
  // moveStage — atomic cross-stage move with source + dest recompaction
  // ---------------------------------------------------------------------------

  async moveStage(
    ctx: SessionContext,
    id: string,
    input: MoveDealStageInput,
  ): Promise<Deal> {
    return withRLS(ctx, async (tx) => {
      // Lock the deal so two concurrent moves on the same id serialise.
      // Without the lock both could read the same `oldOrder` and produce
      // an inconsistent recompaction.
      const locked = await tx
        .select()
        .from(deal)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.id, id),
            isNull(deal.deletedAt),
          ),
        )
        .for("update")
        .limit(1)
      if (locked.length === 0) throw new Error("deal_not_found")
      const current = locked[0]
      const oldStage: DealStage = current.stage
      const oldOrder = current.stageOrder

      // Compute target order: explicit `toOrder` from input, or
      // append-to-bottom via `MAX + 1` for the destination stage.
      const isWithinStage = input.toStage === oldStage
      let toOrder: number
      if (input.toOrder != null) {
        toOrder = input.toOrder
      } else {
        const maxRows = await tx
          .select({
            max: sql<number>`coalesce(max(${deal.stageOrder}), -1)::int`,
          })
          .from(deal)
          .where(
            and(
              eq(deal.organizationId, ctx.orgId),
              eq(deal.stage, input.toStage),
              isNull(deal.deletedAt),
            ),
          )
        // When appending in the same stage, the deal itself is counted in
        // the MAX — subtract 1 so the deal does not move past itself.
        const maxVal = maxRows[0]?.max ?? -1
        toOrder = isWithinStage ? maxVal : maxVal + 1
      }

      const isMovingToTerminal = TERMINAL_STAGES.includes(input.toStage)
      const wasInTerminal = TERMINAL_STAGES.includes(oldStage)
      const isReopening = wasInTerminal && !isMovingToTerminal

      if (isWithinStage) {
        // Same-stage reposition: shift neighbours one slot in the
        // direction opposite to the move so the dense 0..N-1 sequence
        // is preserved.
        if (toOrder !== oldOrder) {
          if (toOrder > oldOrder) {
            // Moving down: decrement rows in (oldOrder, toOrder].
            await tx
              .update(deal)
              .set({ stageOrder: sql`${deal.stageOrder} - 1` })
              .where(
                and(
                  eq(deal.organizationId, ctx.orgId),
                  eq(deal.stage, oldStage),
                  isNull(deal.deletedAt),
                  gt(deal.stageOrder, oldOrder),
                  lte(deal.stageOrder, toOrder),
                ),
              )
          } else {
            // Moving up: increment rows in [toOrder, oldOrder).
            await tx
              .update(deal)
              .set({ stageOrder: sql`${deal.stageOrder} + 1` })
              .where(
                and(
                  eq(deal.organizationId, ctx.orgId),
                  eq(deal.stage, oldStage),
                  isNull(deal.deletedAt),
                  gte(deal.stageOrder, toOrder),
                  lt(deal.stageOrder, oldOrder),
                ),
              )
          }
        }
      } else {
        // Cross-stage move:
        //   1. Make room in the destination column (increment rows
        //      whose stage_order >= toOrder).
        //   2. Compact the source column (decrement rows whose
        //      stage_order > oldOrder, since the moved deal vacated
        //      that slot).
        await tx
          .update(deal)
          .set({ stageOrder: sql`${deal.stageOrder} + 1` })
          .where(
            and(
              eq(deal.organizationId, ctx.orgId),
              eq(deal.stage, input.toStage),
              isNull(deal.deletedAt),
              gte(deal.stageOrder, toOrder),
            ),
          )
        await tx
          .update(deal)
          .set({ stageOrder: sql`${deal.stageOrder} - 1` })
          .where(
            and(
              eq(deal.organizationId, ctx.orgId),
              eq(deal.stage, oldStage),
              isNull(deal.deletedAt),
              gt(deal.stageOrder, oldOrder),
            ),
          )
      }

      // Build the SET clause for the moved deal. Reopen semantics
      // (terminal → active) clear `closedAt` AND `lostReason`; the
      // contract is explicit that BOTH columns reset so a reopened
      // Deal does not carry a stale "lost because price" reason.
      const setClause: Record<string, unknown> = {
        stage: input.toStage,
        stageOrder: toOrder,
      }
      if (isMovingToTerminal) {
        setClause.closedAt = new Date()
      } else if (isReopening) {
        setClause.closedAt = null
        setClause.lostReason = null
      }

      // Defense-in-depth `isNull(deletedAt)` even though the `FOR UPDATE`
      // lock at the top of the tx already prevents concurrent soft-delete
      // from landing between SELECT and UPDATE. Matches the I6 inquiry
      // `discard()` discipline — every mutation re-asserts the lifecycle
      // predicates of the read that authorised it.
      const updated = await tx
        .update(deal)
        .set(setClause)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.id, id),
            isNull(deal.deletedAt),
          ),
        )
        .returning()
      if (updated.length === 0) throw new Error("deal_not_found")
      return mapDealRowToEntity(updated[0])
    })
  }

  // ---------------------------------------------------------------------------
  // reorderInStage — atomic Kanban within-column drag-and-drop
  // ---------------------------------------------------------------------------

  async reorderInStage(
    ctx: SessionContext,
    stage: DealStage,
    orderedIds: string[],
  ): Promise<void> {
    if (TERMINAL_STAGES.includes(stage)) {
      // Reorder only applies to active Kanban columns. Terminal stages
      // (`won`/`lost`) live in the archive view and have no drag handle.
      // Distinct token from `reorder_ids_mismatch` so the action layer
      // surfaces an accurate cause — this is a stage-type guard, not a
      // payload mismatch.
      throw new Error("terminal_stage_reorder")
    }

    return withRLS(ctx, async (tx) => {
      // `FOR UPDATE` locks every active row in the column so concurrent
      // `moveStage` / `softDelete` / another `reorderInStage` on the
      // same column block until this transaction commits. Without the
      // lock, a TOCTOU race could write `stageOrder` to a deal that has
      // been deleted or moved between validation and the UPDATE loop.
      const currentRows = await tx
        .select({ id: deal.id })
        .from(deal)
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.stage, stage),
            isNull(deal.deletedAt),
          ),
        )
        .for("update")
      const currentIds = new Set(currentRows.map((r) => r.id))
      const inputIds = new Set(orderedIds)

      if (
        currentIds.size !== inputIds.size ||
        orderedIds.length !== currentIds.size
      ) {
        throw new Error("reorder_ids_mismatch")
      }
      for (const id of currentIds) {
        if (!inputIds.has(id)) throw new Error("reorder_ids_mismatch")
      }
      for (const id of orderedIds) {
        if (!currentIds.has(id)) throw new Error("reorder_ids_mismatch")
      }

      // Apply the new order. Defense-in-depth: each UPDATE re-asserts
      // `stage` and `isNull(deletedAt)` so even if a concurrent caller
      // somehow circumvents the lock, the mutation only lands on rows
      // that still belong to this Kanban column. Mirror of the I6
      // discard-UPDATE pattern.
      //
      // A per-row UPDATE loop is fine at MVP scale (Kanban columns
      // rarely exceed a few dozen cards). If the column size grows,
      // batch into a single `UPDATE ... FROM (VALUES ...)` at that
      // point — not before.
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(deal)
          .set({ stageOrder: i })
          .where(
            and(
              eq(deal.organizationId, ctx.orgId),
              eq(deal.id, orderedIds[i]),
              eq(deal.stage, stage),
              isNull(deal.deletedAt),
            ),
          )
      }
    })
  }

  // ---------------------------------------------------------------------------
  // softDelete / restore
  // ---------------------------------------------------------------------------

  async softDelete(ctx: SessionContext, id: string): Promise<void> {
    const isSuperAdminAction = ctx.isSuperAdmin === true
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(deal)
        .set({
          deletedAt: new Date(),
          deletedByUserId: isSuperAdminAction ? null : ctx.userId,
          deletedByUserName: isSuperAdminAction ? null : ctx.userName,
          deletedByUserEmail: isSuperAdminAction ? null : ctx.email,
        })
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.id, id),
            isNull(deal.deletedAt),
          ),
        )
        .returning({ id: deal.id }),
    )
    if (rows.length === 0) throw new Error("deal_not_found")
  }

  async restore(ctx: SessionContext, id: string): Promise<Deal> {
    return withRLS(ctx, async (tx) => {
      const rows = await tx
        .update(deal)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          deletedByUserName: null,
          deletedByUserEmail: null,
        })
        .where(
          and(
            eq(deal.organizationId, ctx.orgId),
            eq(deal.id, id),
            isNotNull(deal.deletedAt),
          ),
        )
        .returning()

      if (rows.length > 0) return mapDealRowToEntity(rows[0])

      const existing = await tx
        .select({ id: deal.id, deletedAt: deal.deletedAt })
        .from(deal)
        .where(
          and(eq(deal.organizationId, ctx.orgId), eq(deal.id, id)),
        )
        .limit(1)

      if (existing.length === 0) throw new Error("deal_not_found")
      if (existing[0].deletedAt === null) {
        throw new Error("deal_already_restored")
      }
      throw new Error("deal_no_permission")
    })
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const selectJoinedDeal = {
  deal,
  contactName: contact.name,
  contactPhone: contact.phone,
  contactEmail: contact.email,
  propertyTitle: properties.title,
}

type JoinedDealRow = {
  deal: typeof deal.$inferSelect
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  propertyTitle: string | null
}

// Compile-time key parity guard between `selectJoinedDeal` and
// `JoinedDealRow`. Mirror of the I6 inquiry repo pattern — Drizzle does
// not auto-propagate the inferred shape of a const select, so this
// manual Record assertion forces a tsc error if either side drifts.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _selectKeysInRow: Record<keyof typeof selectJoinedDeal, true> = {
  deal: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  propertyTitle: true,
} satisfies Record<keyof JoinedDealRow, true>

function mapJoinedRow(row: JoinedDealRow): Deal {
  return mapDealRowWithJoinsToEntity(row.deal, {
    contactName: row.contactName ?? undefined,
    contactPhone: row.contactPhone ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    propertyTitle: row.propertyTitle ?? undefined,
  })
}
