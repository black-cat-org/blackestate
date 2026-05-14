import type {
  CreateDealDTO,
  Deal,
  UpdateDealDTO,
} from "@/features/deals/domain/deal.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { DealInsert, DealRow } from "./deal.model"

// ---------------------------------------------------------------------------
// Internal: ISO-string → Date with defensive guard
// ---------------------------------------------------------------------------
//
// `expectedCloseAt` arrives at the mapper as a domain ISO string. The
// server-action boundary is expected to validate it with Zod's
// `.datetime()` before it ever reaches here. This guard is defense-in-
// depth — a future caller (seed script, internal migration, a stray
// programmatic flow that forgets Zod) must not be able to persist an
// `Invalid Date` that would then throw at `.toISOString()` deep inside
// the Drizzle insert, producing a 500 instead of a clear domain error.
//
// `new Date("not a date")` returns an Invalid Date object: truthy, but
// `Number.isNaN(d.getTime())` is the canonical detection. Treating
// invalid inputs as `null` (column cleared) matches the safe-fallback
// pattern used by `toPreferredChannel` in the contact mapper.

function toDateOrNull(value: string | null | undefined): Date | null {
  if (value == null) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// ---------------------------------------------------------------------------
// Model (DB row, uses null) → Entity (domain, uses undefined)
// ---------------------------------------------------------------------------
//
// `stage` and `source` are stored as Postgres enums (`deal_stage_enum`,
// `deal_source_enum` — R12 migration), so the DB constraint guarantees
// only valid union members reach this mapper. No runtime whitelist is
// needed here — contrast with `contact.preferredChannel` which is plain
// `text` and required a defensive guard.

export function mapDealRowToEntity(row: DealRow): Deal {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    contactId: row.contactId,
    propertyId: row.propertyId,
    inquiryId: row.inquiryId ?? undefined,
    stage: row.stage,
    stageOrder: row.stageOrder,
    source: row.source ?? undefined,
    budget: row.budget ?? undefined,
    message: row.message ?? undefined,
    propertyTypeSought: row.propertyTypeSought ?? undefined,
    zoneOfInterest: row.zoneOfInterest ?? undefined,
    wantsOffers: row.wantsOffers,
    expectedCloseAt: row.expectedCloseAt?.toISOString(),
    closedAt: row.closedAt?.toISOString(),
    lostReason: row.lostReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString(),
    deletedBy: row.deletedByUserId
      ? {
          userId: row.deletedByUserId,
          userName: row.deletedByUserName ?? undefined,
          userEmail: row.deletedByUserEmail ?? undefined,
        }
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// Row + joined fields → Entity
// ---------------------------------------------------------------------------
//
// Used by repository queries that JOIN against `contact` and `properties`
// for Kanban card / Deal detail rendering. Consumers that do not need the
// joined fields use `mapDealRowToEntity` directly and leave each undefined.
//
// Each joined field is typed `T | undefined` (not `T | null`): the
// repository is expected to coalesce `?? undefined` BEFORE calling this
// mapper. Mirror of the `mapInquiryRowWithJoinsToEntity` / lead-mapper
// convention.

export interface DealJoinedFields {
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  propertyTitle?: string
}

export function mapDealRowWithJoinsToEntity(
  row: DealRow,
  joins: DealJoinedFields,
): Deal {
  return {
    ...mapDealRowToEntity(row),
    contactName: joins.contactName,
    contactPhone: joins.contactPhone,
    contactEmail: joins.contactEmail,
    propertyTitle: joins.propertyTitle,
  }
}

// ---------------------------------------------------------------------------
// CreateDealDTO → Insert (entity-undefined → DB-null at write time)
// ---------------------------------------------------------------------------
//
// The DTO's dual-mode contact resolution (`contactId` vs `contactDraft`)
// is the use case's responsibility — not the mapper's. The use case
// resolves a draft to a real `contactId` via the Contact repo and passes
// it here. Same separation as the inquiry mapper.
//
// `stageOrder` is computed by the adapter as `MAX(stageOrder) + 1` for
// the target (org, stage) and supplied as a parameter so the mapper
// output is the final Insert row — no two-step "map then patch" dance.
//
// Lifecycle-only columns are intentionally omitted so the DB defaults /
// the dedicated stage-transition use cases own them:
//   - `closedAt`     → set by `moveDealStage` when transitioning to won/lost
//   - `lostReason`   → set by `moveDealStage` on 'lost' (with optional reason)
//   - `id`           → Drizzle `$defaultFn(crypto.randomUUID)`
//   - `createdAt` / `updatedAt` → DB `now()` / `$onUpdate`
//
// Defaults applied at the mapper boundary:
//   - `stage` falls back to `'visit_scheduled'` (canonical "promote because
//     a visit was scheduled" entry point) when the DTO omits it.
//   - `wantsOffers` falls back to `false` (mirrors the `tags?` empty-array
//     pattern in `CreateContactDTO`).

export function mapCreateDTOToInsert(
  data: CreateDealDTO,
  ctx: SessionContext,
  contactId: string,
  stageOrder: number,
): DealInsert {
  return {
    organizationId: ctx.orgId,
    createdByUserId: ctx.userId,
    contactId,
    propertyId: data.propertyId,
    inquiryId: data.inquiryId ?? null,
    stage: data.stage ?? "visit_scheduled",
    stageOrder,
    source: data.source ?? null,
    budget: data.budget ?? null,
    message: data.message ?? null,
    propertyTypeSought: data.propertyTypeSought ?? null,
    zoneOfInterest: data.zoneOfInterest ?? null,
    wantsOffers: data.wantsOffers ?? false,
    expectedCloseAt: toDateOrNull(data.expectedCloseAt),
  }
}

// ---------------------------------------------------------------------------
// UpdateDealDTO → partial DB update record
// ---------------------------------------------------------------------------
//
// `UpdateDealDTO = Partial<Omit<CreateDealDTO, 'contactId' | 'contactDraft'>>`.
// Stage and order moves use the dedicated Kanban server actions
// (`moveDealStage`, `reorderDealsInStage`), NOT this mapper — the
// optimistic-update flow needs to stay separate from generic edit ops.
// `closedAt` / `lostReason` similarly belong to the stage-transition path.

export function mapPartialDTOToUpdate(
  data: UpdateDealDTO,
): Record<string, unknown> {
  const update: Record<string, unknown> = {}

  // NOT NULL fields — use `!== undefined` because they cannot be cleared
  // to null. Setting `propertyId` is allowed (deal reassignment between
  // properties is a valid agent edit); changing `contactId` would mean
  // a contact reassignment, which is intentionally NOT in `UpdateDealDTO`.
  if (data.propertyId !== undefined) update.propertyId = data.propertyId
  if (data.stage !== undefined) update.stage = data.stage
  if (data.wantsOffers !== undefined) update.wantsOffers = data.wantsOffers

  // Optional/clearable fields — `'key' in data` idiom: include the key with
  // `undefined` to clear (write null), omit the key to leave unchanged.
  // Same discipline as the contact and inquiry mappers.
  if ("inquiryId" in data) update.inquiryId = data.inquiryId ?? null
  if ("source" in data) update.source = data.source ?? null
  if ("budget" in data) update.budget = data.budget ?? null
  if ("message" in data) update.message = data.message ?? null
  if ("propertyTypeSought" in data) {
    update.propertyTypeSought = data.propertyTypeSought ?? null
  }
  if ("zoneOfInterest" in data) {
    update.zoneOfInterest = data.zoneOfInterest ?? null
  }
  if ("expectedCloseAt" in data) {
    update.expectedCloseAt = toDateOrNull(data.expectedCloseAt)
  }

  return update
}
