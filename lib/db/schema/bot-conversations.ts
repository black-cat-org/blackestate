import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const botConversations = pgTable("bot_conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  leadId: text("lead_id").notNull(),

  status: text("status").notNull().default("activa"), // activa, pausada, cerrada

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("bot_conv_org_id_idx").on(t.organizationId),
  index("bot_conv_lead_id_idx").on(t.leadId),
]);
