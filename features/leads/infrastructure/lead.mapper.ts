import type {
  Lead,
  PropertyQueueItem,
} from "@/features/leads/domain/lead.entity"
import type { CreateLeadDTO } from "@/features/leads/domain/lead.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type { LeadRow, LeadInsert, QueueItemRow } from "./lead.model"

// ---------------------------------------------------------------------------
// Model (DB row, uses null) → Entity (domain, uses undefined)
// ---------------------------------------------------------------------------

export function mapLeadRowToEntity(row: LeadRow): Lead {
  return {
    id: row.id,
    propertyId: row.propertyId,
    propertyTitle: undefined, // Comes from a join, not stored in leads table
    source: row.source ?? undefined,
    status: row.status,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    message: row.message ?? undefined,
    propertyTypeSought: row.propertyTypeSought ?? undefined,
    budget: row.budget ?? undefined,
    zoneOfInterest: row.zoneOfInterest ?? undefined,
    wantsOffers: row.wantsOffers,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : undefined,
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
// Lead with joined property title
// ---------------------------------------------------------------------------

export function mapLeadRowWithTitleToEntity(
  row: LeadRow,
  propertyTitle: string | undefined,
): Lead {
  return {
    ...mapLeadRowToEntity(row),
    propertyTitle: propertyTitle ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// CreateLeadDTO → Insert model (uses null)
// ---------------------------------------------------------------------------

export function mapCreateDTOToInsert(
  data: CreateLeadDTO,
  ctx: SessionContext,
): LeadInsert {
  return {
    organizationId: ctx.orgId,
    createdByUserId: ctx.userId,
    propertyId: data.propertyId,
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    source: (data.source as LeadInsert["source"]) ?? null,
    message: data.message ?? null,
    propertyTypeSought: data.propertyTypeSought ?? null,
    budget: data.budget ?? null,
    zoneOfInterest: data.zoneOfInterest ?? null,
    wantsOffers: data.wantsOffers,
  }
}

// ---------------------------------------------------------------------------
// Partial Lead entity → update record (domain → DB column mapping)
// ---------------------------------------------------------------------------

export function mapPartialEntityToUpdate(
  data: Partial<Lead>,
): Record<string, unknown> {
  const update: Record<string, unknown> = {}

  if (data.name !== undefined) update.name = data.name
  if (data.propertyId !== undefined) update.propertyId = data.propertyId
  if (data.status !== undefined) update.status = data.status
  if (data.wantsOffers !== undefined) update.wantsOffers = data.wantsOffers

  // Optional/clearable fields use `'key' in data` so an explicit `undefined`
  // sent from the form means "clear" (write null), and absence means
  // "leave unchanged". Without this, agents could not unset a once-set value
  // (e.g. correcting an incorrectly tagged source).
  if ("phone" in data) update.phone = data.phone ?? null
  if ("email" in data) update.email = data.email ?? null
  if ("source" in data) update.source = data.source ?? null
  if ("message" in data) update.message = data.message ?? null
  if ("propertyTypeSought" in data)
    update.propertyTypeSought = data.propertyTypeSought ?? null
  if ("budget" in data) update.budget = data.budget ?? null
  if ("zoneOfInterest" in data)
    update.zoneOfInterest = data.zoneOfInterest ?? null

  return update
}

// ---------------------------------------------------------------------------
// QueueItemRow → PropertyQueueItem entity
// ---------------------------------------------------------------------------

export function mapQueueItemRowToEntity(
  row: QueueItemRow,
  propertyTitle: string,
): PropertyQueueItem {
  return {
    id: row.id,
    propertyId: row.propertyId,
    propertyTitle,
    status: row.status,
    estimatedSendAt: row.estimatedSendAt?.toISOString() ?? undefined,
    sentAt: row.sentAt?.toISOString() ?? undefined,
    addedAt: row.createdAt.toISOString(),
  }
}
