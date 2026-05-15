import { and, asc, eq, isNull, sql } from "drizzle-orm"

import type { IHashtagRepository } from "@/features/ai-contents/domain/hashtag.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { hashtagLibrary } from "@/lib/db/schema"

/**
 * Drizzle implementation of `IHashtagRepository`. Tag normalization
 * (always `#`-prefixed) happens at the adapter boundary so callers
 * can pass `"foo"` or `"#foo"` interchangeably. The partial UNIQUE
 * `(organization_id, tag) WHERE deleted_at IS NULL` (defined in
 * `drizzle/sql/030_ai_contents_extras_and_hashtag_library.sql`)
 * enforces dedup at the DB; ON CONFLICT in bulk insert relies on it.
 */
export class DrizzleHashtagRepository implements IHashtagRepository {
  async findAll(ctx: SessionContext): Promise<string[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({ tag: hashtagLibrary.tag })
        .from(hashtagLibrary)
        .where(
          and(
            eq(hashtagLibrary.organizationId, ctx.orgId),
            isNull(hashtagLibrary.deletedAt),
          ),
        )
        .orderBy(asc(hashtagLibrary.tag)),
    )
    return rows.map((r) => r.tag)
  }

  async add(ctx: SessionContext, tag: string): Promise<void> {
    const normalized = normalizeTag(tag)
    // Restore-or-insert pattern: if the tag was previously
    // soft-deleted, surface it again instead of accumulating dead
    // rows. The partial UNIQUE only constrains `WHERE deleted_at IS
    // NULL`, so a tombstone row + a fresh insert would coexist —
    // restore is cleaner.
    await withRLS(ctx, (tx) =>
      tx.execute(sql`
        WITH restored AS (
          UPDATE ${hashtagLibrary}
          SET deleted_at = NULL,
              deleted_by_user_id = NULL,
              deleted_by_user_name = NULL,
              deleted_by_user_email = NULL
          WHERE ${hashtagLibrary.organizationId} = ${ctx.orgId}
            AND ${hashtagLibrary.tag} = ${normalized}
            AND ${hashtagLibrary.deletedAt} IS NOT NULL
          RETURNING ${hashtagLibrary.id}
        )
        INSERT INTO ${hashtagLibrary}
          (organization_id, created_by_user_id, tag)
        SELECT ${ctx.orgId}, ${ctx.userId}, ${normalized}
        WHERE NOT EXISTS (
          SELECT 1 FROM restored
        )
        AND NOT EXISTS (
          SELECT 1 FROM ${hashtagLibrary}
          WHERE ${hashtagLibrary.organizationId} = ${ctx.orgId}
            AND ${hashtagLibrary.tag} = ${normalized}
            AND ${hashtagLibrary.deletedAt} IS NULL
        )
      `),
    )
  }

  async remove(ctx: SessionContext, tag: string): Promise<void> {
    const normalized = normalizeTag(tag)
    await withRLS(ctx, (tx) =>
      tx
        .update(hashtagLibrary)
        .set({
          deletedAt: new Date(),
          deletedByUserId: ctx.userId,
          deletedByUserName: ctx.userName ?? null,
          deletedByUserEmail: ctx.email ?? null,
        })
        .where(
          and(
            eq(hashtagLibrary.organizationId, ctx.orgId),
            eq(hashtagLibrary.tag, normalized),
            isNull(hashtagLibrary.deletedAt),
          ),
        ),
    )
  }

  async addMany(ctx: SessionContext, tags: string[]): Promise<void> {
    if (tags.length === 0) return
    // Single round-trip restore-or-insert over the whole dedup'd
    // array. Same two-phase semantics as `add()` but folded into one
    // statement so "Agregar todas" from the AI hashtag library (~10
    // tags typical) costs one transaction instead of N. The CTE:
    //   1. `input` materializes the dedup'd, normalized tag list.
    //   2. `restored` resurrects tombstoned rows that match the input.
    //   3. The final INSERT adds rows that neither got restored nor
    //      already exist active — `ON CONFLICT DO NOTHING` on the
    //      partial UNIQUE protects against rare cross-transaction
    //      races (two `addMany` calls landing the same tag at once).
    const unique = [...new Set(tags.map(normalizeTag))]
    await withRLS(ctx, (tx) =>
      tx.execute(sql`
        WITH input AS (
          SELECT UNNEST(${unique}::text[]) AS tag
        ),
        restored AS (
          UPDATE ${hashtagLibrary}
          SET deleted_at = NULL,
              deleted_by_user_id = NULL,
              deleted_by_user_name = NULL,
              deleted_by_user_email = NULL
          WHERE ${hashtagLibrary.organizationId} = ${ctx.orgId}
            AND ${hashtagLibrary.tag} IN (SELECT tag FROM input)
            AND ${hashtagLibrary.deletedAt} IS NOT NULL
          RETURNING ${hashtagLibrary.tag}
        )
        INSERT INTO ${hashtagLibrary}
          (organization_id, created_by_user_id, tag)
        SELECT ${ctx.orgId}, ${ctx.userId}, i.tag
        FROM input i
        WHERE i.tag NOT IN (SELECT tag FROM restored)
          AND NOT EXISTS (
            SELECT 1 FROM ${hashtagLibrary} h
            WHERE h.organization_id = ${ctx.orgId}
              AND h.tag = i.tag
              AND h.deleted_at IS NULL
          )
        ON CONFLICT DO NOTHING
      `),
    )
  }
}

function normalizeTag(tag: string): string {
  const trimmed = tag.trim()
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`
}
