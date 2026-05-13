import { eq, and, isNull, isNotNull, desc } from "drizzle-orm"

import type { IPropertyRepository } from "@/features/properties/domain/property.repository"
import type { Property, PropertyFormData } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { properties } from "@/lib/db/schema"
import { db } from "@/lib/db"
import { PROPERTY_DUPLICATE_SUFFIX } from "@/lib/constants/property"
import {
  mapRowToEntity,
  mapFormDataToInsert,
  mapPartialEntityToUpdate,
} from "./property.mapper"

export class DrizzlePropertyRepository implements IPropertyRepository {
  async findAll(ctx: SessionContext): Promise<Property[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx.select().from(properties).where(isNull(properties.deletedAt)),
    )
    return rows.map(mapRowToEntity)
  }

  async findAllActive(ctx: SessionContext): Promise<Property[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(properties)
        .where(and(isNull(properties.deletedAt), eq(properties.status, "active"))),
    )
    return rows.map(mapRowToEntity)
  }

  async findAllDeleted(ctx: SessionContext): Promise<Property[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(properties)
        .where(isNotNull(properties.deletedAt))
        .orderBy(desc(properties.deletedAt)),
    )
    return rows.map(mapRowToEntity)
  }

  async findById(
    ctx: SessionContext,
    id: string,
  ): Promise<Property | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx.select().from(properties).where(and(eq(properties.id, id), isNull(properties.deletedAt))).limit(1),
    )
    return rows[0] ? mapRowToEntity(rows[0]) : undefined
  }

  async create(
    ctx: SessionContext,
    data: PropertyFormData,
  ): Promise<Property> {
    const insert = mapFormDataToInsert(data, ctx)
    const rows = await withRLS(ctx, (tx) =>
      tx.insert(properties).values(insert).returning(),
    )
    return mapRowToEntity(rows[0])
  }

  async update(
    ctx: SessionContext,
    id: string,
    data: Partial<Property>,
  ): Promise<Property> {
    const updateData = mapPartialEntityToUpdate(data)
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(properties)
        .set(updateData)
        .where(eq(properties.id, id))
        .returning(),
    )
    if (rows.length === 0) {
      throw new Error("Property not found or no permission")
    }
    return mapRowToEntity(rows[0])
  }

  async softDelete(ctx: SessionContext, id: string): Promise<void> {
    // Super admin actions are out-of-org maintenance; recording the platform
    // admin's identity in a tenant audit trail would mislead the org's
    // operators. Leave the audit fields null in that case so the trash UI
    // renders "Eliminado por el sistema" instead of pointing to a stranger.
    const isSuperAdminAction = ctx.isSuperAdmin === true
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(properties)
        .set({
          deletedAt: new Date(),
          deletedByUserId: isSuperAdminAction ? null : ctx.userId,
          deletedByUserName: isSuperAdminAction ? null : ctx.userName,
          deletedByUserEmail: isSuperAdminAction ? null : ctx.email,
        })
        .where(and(eq(properties.id, id), isNull(properties.deletedAt)))
        .returning({ id: properties.id }),
    )
    if (rows.length === 0) {
      throw new Error("Property not found or no permission")
    }
  }

  async restore(ctx: SessionContext, id: string): Promise<Property> {
    return withRLS(ctx, async (tx) => {
      const rows = await tx
        .update(properties)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          deletedByUserName: null,
          deletedByUserEmail: null,
        })
        .where(and(eq(properties.id, id), isNotNull(properties.deletedAt)))
        .returning()

      if (rows.length > 0) return mapRowToEntity(rows[0])

      // Disambiguate active row vs absent. We deliberately do not try to
      // discriminate "row exists but caller has no permission" from "row
      // does not exist": the SELECT runs under the same RLS, so an agent
      // who lacks both `_select_org` (deleted_at IS NULL) and
      // `_select_trash` (own row) visibility receives an empty rowset —
      // returning PROPERTY_NOT_FOUND in that case is intentional, matches
      // the standard security best practice of not leaking existence to
      // unauthorized callers, and keeps the user-facing toast generic.
      const existing = await tx
        .select({ id: properties.id, deletedAt: properties.deletedAt })
        .from(properties)
        .where(eq(properties.id, id))
        .limit(1)

      if (existing.length === 0) throw new Error("PROPERTY_NOT_FOUND")
      if (existing[0].deletedAt === null) throw new Error("PROPERTY_ALREADY_RESTORED")
      // Reachable only when the caller can SELECT the deleted row but for
      // some reason fails the UPDATE policy — defensive fallback.
      throw new Error("PROPERTY_NO_PERMISSION")
    })
  }

  async duplicate(ctx: SessionContext, id: string): Promise<Property> {
    return withRLS(ctx, async (tx) => {
      const original = await tx
        .select()
        .from(properties)
        .where(and(eq(properties.id, id), isNull(properties.deletedAt)))
        .limit(1)

      if (original.length === 0) {
        throw new Error("Property not found")
      }

      const {
        id: _id,
        createdAt: _ca,
        updatedAt: _ua,
        deletedAt: _da,
        ...rest
      } = original[0]

      const rows = await tx
        .insert(properties)
        .values({
          ...rest,
          createdByUserId: ctx.userId,
          title: `${rest.title} ${PROPERTY_DUPLICATE_SUFFIX}`,
          status: "draft",
        })
        .returning()

      return mapRowToEntity(rows[0])
    })
  }

  async findPublicById(id: string): Promise<Property | undefined> {
    const rows = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, id),
          eq(properties.status, "active"),
          isNull(properties.deletedAt),
        ),
      )
      .limit(1)

    if (!rows[0]) return undefined

    const property = mapRowToEntity(rows[0])
    if (property.hideExactLocation) {
      property.address.lat = undefined
      property.address.lng = undefined
      property.address.googleMapsUrl = undefined
    }
    return property
  }
}
