import type { DealStage } from "@/features/deals/domain/deal.entity"
import type {
  CreateInquiryDTO,
  Inquiry,
  UpdateInquiryDTO,
} from "@/features/inquiries/domain/inquiry.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { InquiryInsert, InquiryRow } from "./inquiry.model"

// ---------------------------------------------------------------------------
// Model (DB row, uses null) → Entity (domain, uses undefined)
// ---------------------------------------------------------------------------
//
// `source` and `status` are stored as Postgres enums (`inquiry_source_enum`,
// `inquiry_status_enum` — R12 migration), so the DB constraint guarantees
// only valid union members reach this mapper. No runtime whitelist is
// needed here — contrast with `contact.preferredChannel` which is plain
// `text` and required a defensive guard.

export function mapInquiryRowToEntity(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    contactId: row.contactId,
    propertyId: row.propertyId,
    source: row.source ?? undefined,
    message: row.message ?? undefined,
    status: row.status,
    promotedDealId: row.promotedDealId ?? undefined,
    discardedReason: row.discardedReason ?? undefined,
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
// Used by repository queries that JOIN against `contact`, `properties`, and
// (when `status = 'promoted'`) `deal` for the resulting Deal's current
// stage. Consumers that do not need those fields use
// `mapInquiryRowToEntity` directly and leave them undefined.
//
// Each joined field is typed `T | undefined` (not `T | null`): the
// repository is expected to coalesce `?? undefined` BEFORE calling this
// mapper. Mirror of the `mapLeadRowWithTitleToEntity` convention —
// keeps the mapper's contract narrow and pushes the null coalescing
// to the call site that actually sees the LEFT JOIN nullability.

export interface InquiryJoinedFields {
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  propertyTitle?: string
  promotedDealStage?: DealStage
}

export function mapInquiryRowWithJoinsToEntity(
  row: InquiryRow,
  joins: InquiryJoinedFields,
): Inquiry {
  return {
    ...mapInquiryRowToEntity(row),
    contactName: joins.contactName,
    contactPhone: joins.contactPhone,
    contactEmail: joins.contactEmail,
    propertyTitle: joins.propertyTitle,
    promotedDealStage: joins.promotedDealStage,
  }
}

// ---------------------------------------------------------------------------
// CreateInquiryDTO → Insert (entity-undefined → DB-null at write time)
// ---------------------------------------------------------------------------
//
// The DTO's dual-mode contact resolution (`contactId` vs `contactDraft`)
// is the use case's responsibility — not the mapper's. The use case calls
// `IContactRepository.findByPhoneOrEmail` / `create` to resolve a draft
// to a real `contactId`, then passes the resolved id here. This keeps
// the mapper free of cross-feature dependencies (Clean Architecture
// would be violated if the mapper imported the Contact repo).
//
// Lifecycle-only fields are intentionally omitted so DB defaults apply:
//   - `status`            → defaults to 'open' (every new inquiry starts active)
//   - `promotedDealId`    → only set by `IInquiryRepository.promote`
//   - `discardedReason`   → only set by `IInquiryRepository.discard`
//   - `id`                → Drizzle `$defaultFn(crypto.randomUUID)`
//   - `createdAt`/`updatedAt` → DB `now()` / `$onUpdate`

export function mapCreateDTOToInsert(
  data: CreateInquiryDTO,
  ctx: SessionContext,
  contactId: string,
): InquiryInsert {
  return {
    organizationId: ctx.orgId,
    createdByUserId: ctx.userId,
    contactId,
    propertyId: data.propertyId,
    source: data.source ?? null,
    message: data.message ?? null,
  }
}

// ---------------------------------------------------------------------------
// UpdateInquiryDTO → partial DB update record
// ---------------------------------------------------------------------------
//
// `UpdateInquiryDTO = Partial<Pick<CreateInquiryDTO, 'source' | 'message'>>`
// — only those two columns are user-editable. Status transitions
// (`discard`, `promote`) and the audit trail use dedicated repository
// operations to keep their invariants atomic; they are NOT reachable
// through this mapper by design.

export function mapPartialDTOToUpdate(
  data: UpdateInquiryDTO,
): Record<string, unknown> {
  const update: Record<string, unknown> = {}

  // Both fields are nullable in the DB. The `'key' in data` idiom keeps
  // the "include key with undefined to clear" semantic uniform across
  // the project — see `contact.mapper.ts` for the same pattern + the
  // `UpdateContactDTO` JSDoc that documents why omission vs explicit
  // undefined matter to the caller.
  if ("source" in data) update.source = data.source ?? null
  if ("message" in data) update.message = data.message ?? null

  return update
}
