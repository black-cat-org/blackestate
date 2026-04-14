import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const botConfig = pgTable("bot_config", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().unique(),

  active: boolean("active").notNull().default(false),
  welcomeMessage: text("welcome_message").notNull().default(""),
  appointmentDuration: integer("appointment_duration").notNull().default(60),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(2),

  // { "lunes": { enabled: true, startTime: "09:00", endTime: "18:00" }, ... }
  schedule: jsonb("schedule").notNull().default({}),

  // { newAppointmentRequest: true, appointmentConfirmed: true, ... }
  notifications: jsonb("notifications").notNull().default({}),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
