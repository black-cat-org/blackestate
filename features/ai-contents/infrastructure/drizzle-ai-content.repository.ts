import { and, desc, eq, isNull } from "drizzle-orm"

import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import type {
  CreateAiContentDTO,
  IAiContentRepository,
  UpdateAiContentDTO,
} from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { aiContents, properties } from "@/lib/db/schema"

import { mapAiContentRowToEntity } from "./ai-content.mapper"
import type { AiContentRow } from "./ai-content.model"

/**
 * Drizzle implementation of `IAiContentRepository`. Every query goes
 * through `withRLS(ctx, ...)` and carries an explicit
 * `eq(aiContents.organizationId, ctx.orgId)` predicate —
 * defense-in-depth per CLAUDE.md's "Multitenancy — Zero Tolerance".
 *
 * All reads LEFT JOIN `properties` to surface `propertyTitle` in a
 * single round-trip; the mapper falls back to a Spanish-neutral
 * placeholder when the join misses (property soft-deleted upstream
 * or hidden by RLS).
 *
 * Writes set `created_by_user_id` from `ctx.userId` (the column is
 * NOT NULL at the DB level + enforced by the RLS INSERT WITH CHECK
 * policy). The use case strips this field from the inbound DTO before
 * calling `create`, so the value always comes from the authenticated
 * session and cannot be spoofed by a client.
 */
export class DrizzleAiContentRepository implements IAiContentRepository {
  async findAll(ctx: SessionContext): Promise<AiContent[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          aiContent: aiContents,
          propertyTitle: properties.title,
        })
        .from(aiContents)
        .leftJoin(properties, eq(aiContents.propertyId, properties.id))
        .where(
          and(
            eq(aiContents.organizationId, ctx.orgId),
            isNull(aiContents.deletedAt),
          ),
        )
        .orderBy(desc(aiContents.createdAt)),
    )
    return rows.map((r) =>
      mapAiContentRowToEntity(r.aiContent, {
        propertyTitle: r.propertyTitle ?? undefined,
      }),
    )
  }

  async findByProperty(
    ctx: SessionContext,
    propertyId: string,
  ): Promise<AiContent[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          aiContent: aiContents,
          propertyTitle: properties.title,
        })
        .from(aiContents)
        .leftJoin(properties, eq(aiContents.propertyId, properties.id))
        .where(
          and(
            eq(aiContents.organizationId, ctx.orgId),
            eq(aiContents.propertyId, propertyId),
            isNull(aiContents.deletedAt),
          ),
        )
        .orderBy(desc(aiContents.createdAt)),
    )
    return rows.map((r) =>
      mapAiContentRowToEntity(r.aiContent, {
        propertyTitle: r.propertyTitle ?? undefined,
      }),
    )
  }

  async create(
    ctx: SessionContext,
    data: CreateAiContentDTO,
  ): Promise<AiContent> {
    // `propertyTitle` lives only on the entity (denormalized join);
    // strip it before INSERT — DB has no such column.
    const inserted = await withRLS(ctx, (tx) =>
      tx
        .insert(aiContents)
        .values({
          organizationId: ctx.orgId,
          createdByUserId: ctx.userId,
          propertyId: data.propertyId,
          type: data.type,
          platform: data.platform ?? null,
          text: data.text,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
          publishedTo: data.publishedTo ?? null,
          analytics: data.analytics ?? null,
        })
        .returning(),
    )

    if (inserted.length === 0) {
      throw new Error("ai_content_create_failed")
    }
    return this.hydrateAfterWrite(ctx, inserted[0])
  }

  async update(
    ctx: SessionContext,
    id: string,
    data: UpdateAiContentDTO,
  ): Promise<AiContent> {
    // Build the patch from the supplied fields only — undefined keys
    // are left out so Drizzle does not stomp existing columns with
    // NULL. `propertyTitle` and `createdByUserId` are not writable
    // through this surface (denormalized + audit, respectively).
    const patch: Partial<typeof aiContents.$inferInsert> = {}
    if (data.propertyId !== undefined) patch.propertyId = data.propertyId
    if (data.type !== undefined) patch.type = data.type
    if (data.platform !== undefined) patch.platform = data.platform
    if (data.text !== undefined) patch.text = data.text
    if (data.publishedAt !== undefined) {
      patch.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null
    }
    if (data.publishedTo !== undefined) patch.publishedTo = data.publishedTo
    if (data.analytics !== undefined) patch.analytics = data.analytics

    const updated = await withRLS(ctx, (tx) =>
      tx
        .update(aiContents)
        .set(patch)
        .where(
          and(
            eq(aiContents.id, id),
            eq(aiContents.organizationId, ctx.orgId),
            isNull(aiContents.deletedAt),
          ),
        )
        .returning(),
    )

    if (updated.length === 0) {
      throw new Error("ai_content_not_found")
    }
    return this.hydrateAfterWrite(ctx, updated[0])
  }

  async delete(ctx: SessionContext, id: string): Promise<void> {
    // Soft delete with audit columns populated from ctx — mirror of
    // Inquiry/Deal pattern. The RLS update_role_aware policy gates
    // who can run this UPDATE (creator or owner/admin).
    await withRLS(ctx, (tx) =>
      tx
        .update(aiContents)
        .set({
          deletedAt: new Date(),
          deletedByUserId: ctx.userId,
          deletedByUserName: ctx.userName ?? null,
          deletedByUserEmail: ctx.email ?? null,
        })
        .where(
          and(
            eq(aiContents.id, id),
            eq(aiContents.organizationId, ctx.orgId),
            isNull(aiContents.deletedAt),
          ),
        ),
    )
  }

  async deleteByProperty(
    ctx: SessionContext,
    propertyId: string,
  ): Promise<void> {
    await withRLS(ctx, (tx) =>
      tx
        .update(aiContents)
        .set({
          deletedAt: new Date(),
          deletedByUserId: ctx.userId,
          deletedByUserName: ctx.userName ?? null,
          deletedByUserEmail: ctx.email ?? null,
        })
        .where(
          and(
            eq(aiContents.organizationId, ctx.orgId),
            eq(aiContents.propertyId, propertyId),
            isNull(aiContents.deletedAt),
          ),
        ),
    )
  }

  /**
   * Re-fetches the joined `propertyTitle` after a write so the
   * returned entity matches the shape `findAll` produces. The post-
   * write read is RLS-scoped AND carries an explicit
   * `eq(properties.organizationId, ctx.orgId)` predicate — same
   * defense-in-depth contract as every other read in this repo
   * (CLAUDE.md "Multitenancy zero-tolerance"). RLS alone would
   * suffice for correctness, but the explicit predicate keeps the
   * adapter consistent so a future audit greps a single pattern.
   */
  private async hydrateAfterWrite(
    ctx: SessionContext,
    row: AiContentRow,
  ): Promise<AiContent> {
    const joined = await withRLS(ctx, (tx) =>
      tx
        .select({ propertyTitle: properties.title })
        .from(properties)
        .where(
          and(
            eq(properties.id, row.propertyId),
            eq(properties.organizationId, ctx.orgId),
          ),
        )
        .limit(1),
    )
    return mapAiContentRowToEntity(row, {
      propertyTitle: joined[0]?.propertyTitle ?? undefined,
    })
  }
}
