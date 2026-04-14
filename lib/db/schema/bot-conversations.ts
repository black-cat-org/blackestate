import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { leads } from "./leads";
import { conversationStatusEnum } from "./enums";

export const botConversations = pgTable("bot_conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  leadId: text("lead_id").notNull().references(() => leads.id),

  status: conversationStatusEnum("status").notNull().default("activa"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("bot_conv_org_id_idx").on(t.organizationId),
  index("bot_conv_lead_id_idx").on(t.leadId),
]);
