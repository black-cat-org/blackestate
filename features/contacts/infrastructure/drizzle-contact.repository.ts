import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm"

import type {
  Contact,
  CreateContactDTO,
  UpdateContactDTO,
} from "@/features/contacts/domain/contact.entity"
import type {
  ContactSearchOptions,
  IContactRepository,
} from "@/features/contacts/domain/contact.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { contact } from "@/lib/db/schema"

import {
  mapContactRowToEntity,
  mapCreateDTOToInsert,
  mapPartialDTOToUpdate,
  normalizeContactEmail,
  normalizeContactPhone,
} from "./contact.mapper"

/**
 * Drizzle implementation of `IContactRepository`. Every query goes
 * through `withRLS(ctx, ...)` so the org membership + role-aware policies
 * from migration 026 are evaluated at the DB. The class never reads from
 * the raw `db` pool directly.
 *
 * Throw tokens (all in SCREAMING_SNAKE_CASE):
 *   - `CONTACT_NOT_FOUND_OR_NO_PERMISSION` — generic miss for
 *     update/softDelete, never leaks whether the row exists vs the caller
 *     simply cannot see it.
 *   - `CONTACT_NOT_FOUND` / `CONTACT_ALREADY_RESTORED` / `CONTACT_NO_PERMISSION`
 *     — restore-specific disambiguation after the post-UPDATE re-SELECT.
 *
 * Throwing token strings is the project convention (see Lead and Property
 * repos) so server actions can map them to localised Spanish messages at
 * the presentation boundary instead of leaking English error text to
 * users.
 */
export class DrizzleContactRepository implements IContactRepository {
  // ---------------------------------------------------------------------------
  // Core CRUD
  // ---------------------------------------------------------------------------

  // Every query carries an explicit `eq(contact.organizationId, ctx.orgId)`
  // predicate IN ADDITION to the RLS policy. CLAUDE.md "Multitenancy —
  // Zero Tolerance" mandates both layers: RLS for the security boundary,
  // explicit filter for (a) index hit-rate on composite/partial indexes,
  // and (b) defense-in-depth against the super-admin RLS bypass arm that
  // would otherwise return cross-org rows.

  async findAll(ctx: SessionContext): Promise<Contact[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(contact)
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            isNull(contact.deletedAt),
          ),
        )
        .orderBy(desc(contact.updatedAt)),
    )
    return rows.map(mapContactRowToEntity)
  }

  async findAllDeleted(ctx: SessionContext): Promise<Contact[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(contact)
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            isNotNull(contact.deletedAt),
          ),
        )
        .orderBy(desc(contact.deletedAt)),
    )
    return rows.map(mapContactRowToEntity)
  }

  async findById(
    ctx: SessionContext,
    id: string,
  ): Promise<Contact | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(contact)
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            eq(contact.id, id),
            isNull(contact.deletedAt),
          ),
        )
        .limit(1),
    )
    return rows[0] ? mapContactRowToEntity(rows[0]) : undefined
  }

  // ---------------------------------------------------------------------------
  // Dedup lookup
  // ---------------------------------------------------------------------------

  async findByPhoneOrEmail(
    ctx: SessionContext,
    phone?: string,
    email?: string,
  ): Promise<Contact | undefined> {
    // Apply the same canonicalisation as the mapper used at write time so
    // the comparison is byte-exact against the stored values. Without
    // matching transforms, "+591 712 3456" and "+5917123456" would be
    // treated as different contacts even though they refer to the same
    // person.
    const normPhone = normalizeContactPhone(phone)
    const normEmail = normalizeContactEmail(email)
    if (normPhone === null && normEmail === null) return undefined

    // Build the OR predicate conditionally so each branch hits its
    // dedicated index from migration 026: `contact_org_phone_idx` for the
    // phone equality (partial index, indexed only for non-null, non-deleted
    // contacts) and `contact_org_email_idx` for the `lower(email)`
    // functional equality.
    const predicates = [
      ...(normPhone !== null ? [eq(contact.phone, normPhone)] : []),
      ...(normEmail !== null
        ? [sql`lower(${contact.email}) = ${normEmail}`]
        : []),
    ]
    const matchPredicate =
      predicates.length === 1 ? predicates[0] : or(...predicates)

    // `organization_id = ctx.orgId` is REQUIRED in addition to the
    // `is_org_member`-guarded RLS policy. Two reasons (CLAUDE.md
    // "Multitenancy — Zero Tolerance"):
    //   1. Defense-in-depth: the super-admin RLS arm bypasses the org
    //      filter and would otherwise let a platform-admin caller match
    //      a contact in the wrong org.
    //   2. Index hit-rate: the partial indexes from migration 026 are
    //      composite on `(organization_id, phone)` and
    //      `(organization_id, lower(email))`. Without `organizationId`
    //      as a leading equality predicate, the planner falls back to a
    //      sequential scan over the entire `contact` table.
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(contact)
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            matchPredicate,
            isNull(contact.deletedAt),
          ),
        )
        .orderBy(desc(contact.updatedAt))
        .limit(1),
    )
    return rows[0] ? mapContactRowToEntity(rows[0]) : undefined
  }

  // ---------------------------------------------------------------------------
  // Autocomplete search
  // ---------------------------------------------------------------------------

  async searchByQuery(
    ctx: SessionContext,
    query: string,
    options: ContactSearchOptions = {},
  ): Promise<Contact[]> {
    const trimmed = query.trim()
    if (trimmed.length === 0) return []
    const limit = options.limit ?? 10

    // `%query%` ILIKE is the most permissive autocomplete match — matches
    // substrings, case-insensitive. It does NOT hit the equality / functional
    // indexes from migration 026 (those require exact matches). At MVP scale
    // (autocomplete capped at `limit`, soft-deleted excluded, scoped to the
    // org by RLS), a sequential scan over a few hundred rows is acceptable.
    // If contact volume grows past ~10K per org, add a pg_trgm GIN index
    // over the three identity columns and switch to `name % query`.
    const pattern = `%${trimmed}%`

    // `organization_id = ctx.orgId` required for the same defense-in-depth
    // + index-hit reasons as `findByPhoneOrEmail` (see comment block there).
    // `contact_active_org_idx` is a partial index scoped to
    // `(organization_id) WHERE deleted_at IS NULL`; without the leading
    // org filter the planner sequentially scans every contact in the table.
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(contact)
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            isNull(contact.deletedAt),
            or(
              ilike(contact.name, pattern),
              ilike(contact.phone, pattern),
              ilike(contact.email, pattern),
            ),
          ),
        )
        .orderBy(desc(contact.updatedAt))
        .limit(limit),
    )
    return rows.map(mapContactRowToEntity)
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  async create(
    ctx: SessionContext,
    data: CreateContactDTO,
  ): Promise<Contact> {
    const insert = mapCreateDTOToInsert(data, ctx)
    const rows = await withRLS(ctx, (tx) =>
      tx.insert(contact).values(insert).returning(),
    )
    return mapContactRowToEntity(rows[0])
  }

  async update(
    ctx: SessionContext,
    id: string,
    data: UpdateContactDTO,
  ): Promise<Contact> {
    const updateData = mapPartialDTOToUpdate(data)
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(contact)
        .set(updateData)
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            eq(contact.id, id),
            isNull(contact.deletedAt),
          ),
        )
        .returning(),
    )
    if (rows.length === 0) {
      throw new Error("CONTACT_NOT_FOUND_OR_NO_PERMISSION")
    }
    return mapContactRowToEntity(rows[0])
  }

  async softDelete(ctx: SessionContext, id: string): Promise<void> {
    // Super admin actions live outside any single org; recording the
    // platform admin's identity in a tenant audit trail would mislead
    // operators. Leave the audit fields null so the trash UI renders
    // "Eliminado por el sistema" instead of a name + email from a
    // different org.
    const isSuperAdminAction = ctx.isSuperAdmin === true
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(contact)
        .set({
          deletedAt: new Date(),
          deletedByUserId: isSuperAdminAction ? null : ctx.userId,
          deletedByUserName: isSuperAdminAction ? null : ctx.userName,
          deletedByUserEmail: isSuperAdminAction ? null : ctx.email,
        })
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            eq(contact.id, id),
            isNull(contact.deletedAt),
          ),
        )
        .returning({ id: contact.id }),
    )
    if (rows.length === 0) {
      throw new Error("CONTACT_NOT_FOUND_OR_NO_PERMISSION")
    }
  }

  async restore(ctx: SessionContext, id: string): Promise<Contact> {
    return withRLS(ctx, async (tx) => {
      const rows = await tx
        .update(contact)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          deletedByUserName: null,
          deletedByUserEmail: null,
        })
        .where(
          and(
            eq(contact.organizationId, ctx.orgId),
            eq(contact.id, id),
            isNotNull(contact.deletedAt),
          ),
        )
        .returning()

      if (rows.length > 0) return mapContactRowToEntity(rows[0])

      // Disambiguate "not found" vs "already active" vs "no permission".
      // The SELECT below scopes by `organization_id` explicitly so a
      // super-admin caller can't accidentally surface existence of a
      // contact in a different org with the same id (UUID collision is
      // astronomically unlikely, but the policy is "do not leak
      // existence — period"). For a non-super-admin, the org filter is
      // redundant with the RLS `select_trash` policy but harmless.
      const existing = await tx
        .select({ id: contact.id, deletedAt: contact.deletedAt })
        .from(contact)
        .where(
          and(eq(contact.organizationId, ctx.orgId), eq(contact.id, id)),
        )
        .limit(1)

      if (existing.length === 0) throw new Error("CONTACT_NOT_FOUND")
      if (existing[0].deletedAt === null) {
        throw new Error("CONTACT_ALREADY_RESTORED")
      }
      // Reachable only when the caller can SELECT the deleted row but
      // fails the `contact_update_restore` policy — defensive fallback.
      throw new Error("CONTACT_NO_PERMISSION")
    })
  }
}
