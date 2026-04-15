import { eq, and, isNull } from "drizzle-orm"

import type { IPropertyRepository } from "@/features/properties/domain/property.repository"
import type { Property, PropertyFormData } from "@/features/properties/domain/property.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { properties } from "@/lib/db/schema"
import { db } from "@/lib/db"
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
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(properties)
        .set({ deletedAt: new Date() })
        .where(eq(properties.id, id))
        .returning({ id: properties.id }),
    )
    if (rows.length === 0) {
      throw new Error("Property not found or no permission")
    }
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
          title: `${rest.title} (copy)`,
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
