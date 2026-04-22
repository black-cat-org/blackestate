import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { leads } from "./leads";
import { properties } from "./properties";
import { appointmentStatusEnum } from "./enums";

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: uuid("organization_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  propertyId: text("property_id").notNull().references(() => properties.id),

  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),

  status: appointmentStatusEnum("status").notNull().default("requested"),
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
}, (t) => [
  index("appointments_org_id_idx").on(t.organizationId),
  index("appointments_lead_id_idx").on(t.leadId),
  index("appointments_status_idx").on(t.status),
  index("appointments_starts_at_idx").on(t.startsAt),
  index("appointments_org_starts_idx").on(t.organizationId, t.startsAt),
  index("appointments_org_created_by_idx").on(t.organizationId, t.createdByUserId),
]);
