import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformAdmins = pgTable("platform_admins", {
  userId: text("user_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
