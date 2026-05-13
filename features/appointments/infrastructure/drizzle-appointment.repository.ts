import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm"

import type { IAppointmentRepository } from "@/features/appointments/domain/appointment.repository"
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { appointments, leads, properties } from "@/lib/db/schema"
import {
  mapRowToEntity,
  mapCreateDTOToInsert,
  mapUpdateDTOToUpdate,
} from "./appointment.mapper"

export class DrizzleAppointmentRepository implements IAppointmentRepository {
  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findAll(ctx: SessionContext): Promise<Appointment[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          appointment: appointments,
          leadName: leads.name,
          leadPhone: leads.phone,
          propertyTitle: properties.title,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(isNull(appointments.deletedAt))
    })

    return rows.map((r) =>
      mapRowToEntity(
        r.appointment,
        r.leadName ?? "Unknown",
        r.leadPhone ?? undefined,
        r.propertyTitle ?? "Unknown",
      ),
    )
  }

  async findByLead(
    ctx: SessionContext,
    leadId: string,
  ): Promise<Appointment[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          appointment: appointments,
          leadName: leads.name,
          leadPhone: leads.phone,
          propertyTitle: properties.title,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(
          and(
            eq(appointments.leadId, leadId),
            isNull(appointments.deletedAt),
          ),
        )
    })

    return rows.map((r) =>
      mapRowToEntity(
        r.appointment,
        r.leadName ?? "Unknown",
        r.leadPhone ?? undefined,
        r.propertyTitle ?? "Unknown",
      ),
    )
  }

  async findByDate(
    ctx: SessionContext,
    date: string,
  ): Promise<Appointment[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          appointment: appointments,
          leadName: leads.name,
          leadPhone: leads.phone,
          propertyTitle: properties.title,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(
          and(
            sql`${appointments.startsAt}::date = ${date}`,
            isNull(appointments.deletedAt),
          ),
        )
    })

    return rows.map((r) =>
      mapRowToEntity(
        r.appointment,
        r.leadName ?? "Unknown",
        r.leadPhone ?? undefined,
        r.propertyTitle ?? "Unknown",
      ),
    )
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  async create(
    ctx: SessionContext,
    data: CreateAppointmentDTO,
  ): Promise<Appointment> {
    const insert = mapCreateDTOToInsert(data, ctx)
    const rows = await withRLS(ctx, (tx) =>
      tx.insert(appointments).values(insert).returning(),
    )
    return mapRowToEntity(
      rows[0],
      data.leadName,
      data.leadPhone,
      data.propertyTitle,
    )
  }

  async updateStatus(
    ctx: SessionContext,
    id: string,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    const lifecycleTimestamp = getLifecycleTimestamp(status)

    const rows = await withRLS(ctx, async (tx) => {
      const updated = await tx
        .update(appointments)
        .set({ status, ...lifecycleTimestamp })
        .where(
          and(eq(appointments.id, id), isNull(appointments.deletedAt)),
        )
        .returning()

      if (updated.length === 0) {
        throw new Error("Appointment not found or no permission")
      }

      const joined = await tx
        .select({
          appointment: appointments,
          leadName: leads.name,
          leadPhone: leads.phone,
          propertyTitle: properties.title,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(and(eq(appointments.id, updated[0].id), isNull(appointments.deletedAt)))
        .limit(1)

      return joined
    })

    return mapRowToEntity(
      rows[0].appointment,
      rows[0].leadName ?? "Unknown",
      rows[0].leadPhone ?? undefined,
      rows[0].propertyTitle ?? "Unknown",
    )
  }

  async findAllDeleted(ctx: SessionContext): Promise<Appointment[]> {
    const rows = await withRLS(ctx, async (tx) => {
      return tx
        .select({
          appointment: appointments,
          leadName: leads.name,
          leadPhone: leads.phone,
          propertyTitle: properties.title,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(isNotNull(appointments.deletedAt))
        .orderBy(desc(appointments.deletedAt))
    })

    return rows.map((r) =>
      mapRowToEntity(
        r.appointment,
        r.leadName ?? "Unknown",
        r.leadPhone ?? undefined,
        r.propertyTitle ?? "Unknown",
      ),
    )
  }

  async update(
    ctx: SessionContext,
    id: string,
    data: UpdateAppointmentDTO,
  ): Promise<Appointment> {
    return withRLS(ctx, async (tx) => {
      // Read current under same RLS transaction as the UPDATE so we never
      // operate on a stale snapshot when composing startsAt/endsAt.
      const current = await tx
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
        .limit(1)

      if (current.length === 0) {
        throw new Error("Appointment not found or no permission")
      }

      const currentRow = current[0]
      const finalUpdate = mapUpdateDTOToUpdate(data, {
        date: currentRow.startsAt.toISOString().split("T")[0],
        time: currentRow.startsAt.toISOString().slice(11, 16),
        endTime: currentRow.endsAt.toISOString().slice(11, 16),
      })

      const targetId =
        Object.keys(finalUpdate).length === 0
          ? currentRow.id
          : (
              await tx
                .update(appointments)
                .set(finalUpdate)
                .where(
                  and(eq(appointments.id, id), isNull(appointments.deletedAt)),
                )
                .returning({ id: appointments.id })
            )[0]?.id

      if (!targetId) {
        throw new Error("Appointment not found or no permission")
      }

      const joined = await tx
        .select({
          appointment: appointments,
          leadName: leads.name,
          leadPhone: leads.phone,
          propertyTitle: properties.title,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(eq(appointments.id, targetId))
        .limit(1)

      return mapRowToEntity(
        joined[0].appointment,
        joined[0].leadName ?? "Unknown",
        joined[0].leadPhone ?? undefined,
        joined[0].propertyTitle ?? "Unknown",
      )
    })
  }

  async softDelete(ctx: SessionContext, id: string): Promise<void> {
    // Super admin actions are platform-level; recording the platform admin's
    // identity in a tenant audit trail would mislead operators. Leave the
    // audit fields null so the trash UI renders "Eliminado por el sistema".
    const isSuperAdminAction = ctx.isSuperAdmin === true
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(appointments)
        .set({
          deletedAt: new Date(),
          deletedByUserId: isSuperAdminAction ? null : ctx.userId,
          deletedByUserName: isSuperAdminAction ? null : ctx.userName,
          deletedByUserEmail: isSuperAdminAction ? null : ctx.email,
        })
        .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
        .returning({ id: appointments.id }),
    )
    if (rows.length === 0) {
      throw new Error("Appointment not found or no permission")
    }
  }

  async restore(ctx: SessionContext, id: string): Promise<Appointment> {
    return withRLS(ctx, async (tx) => {
      const updated = await tx
        .update(appointments)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          deletedByUserName: null,
          deletedByUserEmail: null,
        })
        .where(and(eq(appointments.id, id), isNotNull(appointments.deletedAt)))
        .returning()

      if (updated.length === 0) {
        // Disambiguate to surface a clear typed error to the caller.
        const existing = await tx
          .select({ id: appointments.id, deletedAt: appointments.deletedAt })
          .from(appointments)
          .where(eq(appointments.id, id))
          .limit(1)

        if (existing.length === 0) throw new Error("APPOINTMENT_NOT_FOUND")
        if (existing[0].deletedAt === null)
          throw new Error("APPOINTMENT_ALREADY_RESTORED")
        // Dead branch under current RLS: `_select_trash` and `_update_restore`
        // share identical predicates (migration 017), so if RLS lets the
        // SELECT succeed the UPDATE will too. Kept to surface unexpected
        // policy drift rather than swallow the error silently.
        throw new Error("APPOINTMENT_NOT_FOUND")
      }

      const joined = await tx
        .select({
          appointment: appointments,
          leadName: leads.name,
          leadPhone: leads.phone,
          propertyTitle: properties.title,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .leftJoin(properties, eq(appointments.propertyId, properties.id))
        .where(eq(appointments.id, updated[0].id))
        .limit(1)

      return mapRowToEntity(
        joined[0].appointment,
        joined[0].leadName ?? "Unknown",
        joined[0].leadPhone ?? undefined,
        joined[0].propertyTitle ?? "Unknown",
      )
    })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLifecycleTimestamp(
  status: AppointmentStatus,
): Record<string, Date> {
  const now = new Date()
  switch (status) {
    case "confirmed":
      return { confirmedAt: now }
    case "completed":
      return { completedAt: now }
    case "cancelled":
      return { cancelledAt: now }
    default:
      return {}
  }
}
