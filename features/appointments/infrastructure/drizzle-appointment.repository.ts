import { eq, and, isNull, sql } from "drizzle-orm"

import type { IAppointmentRepository } from "@/features/appointments/domain/appointment.repository"
import type {
  Appointment,
  AppointmentStatus,
} from "@/features/appointments/domain/appointment.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { withRLS } from "@/features/shared/infrastructure/rls"
import { appointments, leads, properties } from "@/lib/db/schema"
import { mapRowToEntity, mapCreateDTOToInsert } from "./appointment.mapper"
import type { CreateAppointmentDTO } from "@/features/appointments/domain/appointment.entity"

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

  async softDelete(ctx: SessionContext, id: string): Promise<void> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .update(appointments)
        .set({ deletedAt: new Date() })
        .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
        .returning({ id: appointments.id }),
    )
    if (rows.length === 0) {
      throw new Error("Appointment not found or no permission")
    }
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
