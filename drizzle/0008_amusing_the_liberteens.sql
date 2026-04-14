CREATE UNIQUE INDEX "agent_profiles_user_org_idx" ON "agent_profiles" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "ai_contents_org_id_idx" ON "ai_contents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_contents_property_id_idx" ON "ai_contents" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "analytics_org_id_idx" ON "analytics_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "analytics_event_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_org_created_idx" ON "analytics_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "appointments_org_id_idx" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointments_lead_id_idx" ON "appointments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointments_starts_at_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "bot_conv_org_id_idx" ON "bot_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bot_conv_lead_id_idx" ON "bot_conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "bot_msg_conversation_id_idx" ON "bot_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "lpq_lead_id_idx" ON "lead_property_queue" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lpq_org_id_idx" ON "lead_property_queue" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "leads_org_id_idx" ON "leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "leads_property_id_idx" ON "leads" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_org_status_idx" ON "leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "properties_org_id_idx" ON "properties" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_org_status_idx" ON "properties" USING btree ("organization_id","status");