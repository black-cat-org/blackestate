import { eq, and, isNull, asc, sql } from "drizzle-orm"

import type { ILeadRepository, CreateLeadDTO } from "@/features/leads/domain/lead.repository"
import type {
  Lead,
  PropertyQueueItem,
  QueueStatus,
  QueueStatusId,
  CatalogTracking,
  PropertyVisit,
} from "@/features/leads/domain/lead.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { leads, leadPropertyQueue, properties, analyticsEvents } from "@/lib/db/schema"
import { db } from "@/lib/db"
import {
  mapLeadRowToEntity,
  mapLeadRowWithTitleToEntity,
  mapCreateDTOToInsert,
  mapPartialEntityToUpdate,
  mapQueueItemRowToEntity,
} from "./lead.mapper"

export class DrizzleLeadRepository implements ILeadRepository {
  // ---------------------------------------------------------------------------
  // Core CRUD
  // ---------------------------------------------------------------------------

  async findAll(ctx: SessionContext): Promise<Lead[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          lead: leads,
          propertyTitle: properties.title,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .where(isNull(leads.deletedAt))
    })

    return rows.map((r) =>
      mapLeadRowWithTitleToEntity(r.lead, r.propertyTitle ?? undefined),
    )
  }

  async findById(
    ctx: SessionContext,
    id: string,
  ): Promise<Lead | undefined> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          lead: leads,
          propertyTitle: properties.title,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
        .limit(1)
    })

    if (!rows[0]) return undefined
    return mapLeadRowWithTitleToEntity(rows[0].lead, rows[0].propertyTitle ?? undefined)
  }

  async findByPropertyId(
    ctx: SessionContext,
    propertyId: string,
  ): Promise<Lead[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          lead: leads,
          propertyTitle: properties.title,
        })
        .from(leads)
        .leftJoin(properties, eq(leads.propertyId, properties.id))
        .where(
          and(eq(leads.propertyId, propertyId), isNull(leads.deletedAt)),
        )
    })

    return rows.map((r) =>
      mapLeadRowWithTitleToEntity(r.lead, r.propertyTitle ?? undefined),
    )
  }

  async create(ctx: SessionContext, data: CreateLeadDTO): Promise<Lead> {
    const insert = mapCreateDTOToInsert(data, ctx)
    const rows = await withRLS(ctx, (tx) =>
      tx.insert(leads).values(insert).returning(),
    )
    return mapLeadRowWithTitleToEntity(rows[0], data.propertyTitle)
  }

  async update(
    ctx: SessionContext,
    id: string,
    data: Partial<Lead>,
  ): Promise<Lead> {
    const updateData = mapPartialEntityToUpdate(data)
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(leads)
        .set(updateData)
        .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
        .returning(),
    )
    if (rows.length === 0) {
      throw new Error("Lead not found or no permission")
    }
    return mapLeadRowToEntity(rows[0])
  }

  async softDelete(ctx: SessionContext, id: string): Promise<void> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(leads)
        .set({ deletedAt: new Date() })
        .where(eq(leads.id, id))
        .returning({ id: leads.id }),
    )
    if (rows.length === 0) {
      throw new Error("Lead not found or no permission")
    }
  }

  // ---------------------------------------------------------------------------
  // Queue operations
  // ---------------------------------------------------------------------------

  async getQueueStatus(
    ctx: SessionContext,
    leadId: string,
  ): Promise<QueueStatus> {
    return withRLS(ctx, async (tx) => {
      const leadRows = await tx
        .select({ status: leads.status })
        .from(leads)
        .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
        .limit(1)

      if (leadRows.length === 0) {
        return { status: "waiting" as const }
      }

      const leadStatus = leadRows[0].status
      const statusMap: Record<string, QueueStatusId> = {
        won: "inactive_won",
        lost: "inactive_lost",
        discarded: "inactive_discarded",
      }

      if (statusMap[leadStatus]) {
        return { status: statusMap[leadStatus] }
      }

      const queueItems = await tx
        .select({ status: leadPropertyQueue.status })
        .from(leadPropertyQueue)
        .where(
          and(
            eq(leadPropertyQueue.leadId, leadId),
            isNull(leadPropertyQueue.deletedAt),
          ),
        )

      if (queueItems.length === 0) {
        return { status: "waiting" as const }
      }

      const hasPending = queueItems.some((q) => q.status === "pending")
      const hasPaused = queueItems.some((q) => q.status === "paused")

      if (hasPaused) return { status: "paused_conversation" as const }
      if (hasPending) return { status: "active" as const }

      return { status: "waiting" as const }
    })
  }

  async getPropertyQueue(
    ctx: SessionContext,
    leadId: string,
  ): Promise<PropertyQueueItem[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          queueItem: leadPropertyQueue,
          propertyTitle: properties.title,
        })
        .from(leadPropertyQueue)
        .leftJoin(
          properties,
          eq(leadPropertyQueue.propertyId, properties.id),
        )
        .where(
          and(
            eq(leadPropertyQueue.leadId, leadId),
            isNull(leadPropertyQueue.deletedAt),
          ),
        )
        .orderBy(asc(leadPropertyQueue.sortOrder)),
    )

    return rows.map((r) =>
      mapQueueItemRowToEntity(
        r.queueItem,
        r.propertyTitle ?? "Unknown property",
      ),
    )
  }

  async addToQueue(
    ctx: SessionContext,
    leadId: string,
    propertyId: string,
    propertyTitle: string,
  ): Promise<PropertyQueueItem> {
    return withRLS(ctx, async (tx) => {
      // Get the next sort order
      const existing = await tx
        .select({ sortOrder: leadPropertyQueue.sortOrder })
        .from(leadPropertyQueue)
        .where(
          and(
            eq(leadPropertyQueue.leadId, leadId),
            isNull(leadPropertyQueue.deletedAt),
          ),
        )
        .orderBy(asc(leadPropertyQueue.sortOrder))

      const maxSort =
        existing.length > 0
          ? Math.max(...existing.map((e) => e.sortOrder))
          : -1

      const rows = await tx
        .insert(leadPropertyQueue)
        .values({
          organizationId: ctx.orgId,
          createdByUserId: ctx.userId,
          leadId,
          propertyId,
          sortOrder: maxSort + 1,
        })
        .returning()

      return mapQueueItemRowToEntity(rows[0], propertyTitle)
    })
  }

  async removeFromQueue(
    ctx: SessionContext,
    _leadId: string,
    queueItemId: string,
  ): Promise<void> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(leadPropertyQueue)
        .set({ deletedAt: new Date() })
        .where(eq(leadPropertyQueue.id, queueItemId))
        .returning({ id: leadPropertyQueue.id }),
    )
    if (rows.length === 0) {
      throw new Error("Queue item not found or no permission")
    }
  }

  async sendQueueItemNow(
    ctx: SessionContext,
    _leadId: string,
    queueItemId: string,
  ): Promise<PropertyQueueItem> {
    return withRLS(ctx, async (tx) => {
      const rows = await tx
        .update(leadPropertyQueue)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(leadPropertyQueue.id, queueItemId))
        .returning()

      if (rows.length === 0) {
        throw new Error("Queue item not found or no permission")
      }

      const propertyRows = await tx
        .select({ title: properties.title })
        .from(properties)
        .where(eq(properties.id, rows[0].propertyId))
        .limit(1)

      return mapQueueItemRowToEntity(
        rows[0],
        propertyRows[0]?.title ?? "",
      )
    })
  }

  async reorderQueue(
    ctx: SessionContext,
    leadId: string,
    itemIds: string[],
  ): Promise<PropertyQueueItem[]> {
    return withRLS(ctx, async (tx) => {
      for (let i = 0; i < itemIds.length; i++) {
        await tx
          .update(leadPropertyQueue)
          .set({ sortOrder: i })
          .where(
            and(
              eq(leadPropertyQueue.id, itemIds[i]),
              eq(leadPropertyQueue.leadId, leadId),
            ),
          )
      }

      const rows = await tx
        .select({
          queueItem: leadPropertyQueue,
          propertyTitle: properties.title,
        })
        .from(leadPropertyQueue)
        .leftJoin(properties, eq(leadPropertyQueue.propertyId, properties.id))
        .where(
          and(
            eq(leadPropertyQueue.leadId, leadId),
            isNull(leadPropertyQueue.deletedAt),
          ),
        )
        .orderBy(asc(leadPropertyQueue.sortOrder))

      return rows.map((r) =>
        mapQueueItemRowToEntity(r.queueItem, r.propertyTitle ?? ""),
      )
    })
  }

  // ---------------------------------------------------------------------------
  // Catalog tracking
  // ---------------------------------------------------------------------------

  async getCatalogTracking(
    _ctx: SessionContext,
    _leadId: string,
  ): Promise<CatalogTracking> {
    // No dedicated catalog tracking table yet — return a safe default.
    // This will be implemented when catalog sending is built out.
    return { sentWithOrigin: false, openedAt: undefined }
  }

  // ---------------------------------------------------------------------------
  // Visits (public — no auth)
  // ---------------------------------------------------------------------------

  async trackVisit(
    propertyId: string,
    source: string | null,
  ): Promise<PropertyVisit> {
    // Visits are public (from landing pages) — no RLS needed.
    // We use analyticsEvents with eventType "property_visit".
    // We need the organizationId from the property.
    const propertyRows = await db
      .select({
        organizationId: properties.organizationId,
      })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1)

    if (propertyRows.length === 0) {
      throw new Error("Property not found")
    }

    const rows = await db
      .insert(analyticsEvents)
      .values({
        organizationId: propertyRows[0].organizationId,
        eventType: "property_visit",
        metadata: { propertyId, source },
      })
      .returning()

    return {
      id: rows[0].id,
      propertyId,
      source: source ?? undefined,
      timestamp: rows[0].createdAt.toISOString(),
    }
  }

  async getVisitsByProperty(propertyId: string): Promise<PropertyVisit[]> {
    const rows = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "property_visit"),
          sql`${analyticsEvents.metadata} @> ${JSON.stringify({ propertyId })}::jsonb`,
        ),
      )

    return rows.map((r) => {
      const meta = r.metadata as Record<string, unknown>
      return {
        id: r.id,
        propertyId,
        source: (meta?.source as string) ?? undefined,
        timestamp: r.createdAt.toISOString(),
      }
    })
  }
}
