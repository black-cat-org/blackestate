CREATE TYPE "public"."ai_content_type" AS ENUM('description', 'caption', 'hashtags', 'brochure');--> statement-breakpoint
CREATE TYPE "public"."ai_platform" AS ENUM('facebook', 'instagram', 'tiktok', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('requested', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USD', 'BOB');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('facebook', 'instagram', 'whatsapp', 'tiktok', 'google', 'referral', 'direct');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'interested', 'won', 'lost', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."message_content_type" AS ENUM('text', 'image', 'pdf', 'property_card');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('bot', 'client', 'agent');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'delivered', 'read');--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('sale', 'rent', 'short_term', 'anticretico');--> statement-breakpoint
CREATE TYPE "public"."orientation" AS ENUM('north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest');--> statement-breakpoint
CREATE TYPE "public"."property_condition" AS ENUM('new', 'excellent', 'good', 'fair', 'to_renovate');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('draft', 'in_review', 'active', 'paused', 'sold', 'rented', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('house', 'apartment', 'land', 'commercial', 'office', 'warehouse', 'cabin', 'ph');--> statement-breakpoint
CREATE TYPE "public"."queue_item_status" AS ENUM('pending', 'sent', 'paused');--> statement-breakpoint
CREATE TYPE "public"."surface_unit" AS ENUM('m2', 'ha');--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"transferred_by_user_id" text NOT NULL,
	"property_ids" text[] NOT NULL,
	"leads_count" integer DEFAULT 0 NOT NULL,
	"appointments_count" integer DEFAULT 0 NOT NULL,
	"ai_contents_count" integer DEFAULT 0 NOT NULL,
	"queue_items_count" integer DEFAULT 0 NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_contents" ALTER COLUMN "type" SET DATA TYPE "public"."ai_content_type" USING "type"::"public"."ai_content_type";--> statement-breakpoint
ALTER TABLE "ai_contents" ALTER COLUMN "platform" SET DATA TYPE "public"."ai_platform" USING "platform"::"public"."ai_platform";--> statement-breakpoint
ALTER TABLE "ai_contents" ALTER COLUMN "published_to" SET DATA TYPE "public"."ai_platform" USING "published_to"::"public"."ai_platform";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'requested'::"public"."appointment_status";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DATA TYPE "public"."appointment_status" USING "status"::"public"."appointment_status";--> statement-breakpoint
ALTER TABLE "bot_conversations" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."conversation_status";--> statement-breakpoint
ALTER TABLE "bot_conversations" ALTER COLUMN "status" SET DATA TYPE "public"."conversation_status" USING "status"::"public"."conversation_status";--> statement-breakpoint
ALTER TABLE "bot_messages" ALTER COLUMN "sender" SET DATA TYPE "public"."message_sender" USING "sender"::"public"."message_sender";--> statement-breakpoint
ALTER TABLE "bot_messages" ALTER COLUMN "content_type" SET DEFAULT 'text'::"public"."message_content_type";--> statement-breakpoint
ALTER TABLE "bot_messages" ALTER COLUMN "content_type" SET DATA TYPE "public"."message_content_type" USING "content_type"::"public"."message_content_type";--> statement-breakpoint
ALTER TABLE "bot_messages" ALTER COLUMN "status" SET DEFAULT 'sent'::"public"."message_status";--> statement-breakpoint
ALTER TABLE "bot_messages" ALTER COLUMN "status" SET DATA TYPE "public"."message_status" USING "status"::"public"."message_status";--> statement-breakpoint
ALTER TABLE "lead_property_queue" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."queue_item_status";--> statement-breakpoint
ALTER TABLE "lead_property_queue" ALTER COLUMN "status" SET DATA TYPE "public"."queue_item_status" USING "status"::"public"."queue_item_status";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "source" SET DATA TYPE "public"."lead_source" USING "source"::"public"."lead_source";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "type" SET DATA TYPE "public"."property_type" USING "type"::"public"."property_type";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "operation_type" SET DATA TYPE "public"."operation_type" USING "operation_type"::"public"."operation_type";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."property_status";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "status" SET DATA TYPE "public"."property_status" USING "status"::"public"."property_status";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "price_currency" SET DATA TYPE "public"."currency" USING "price_currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "expenses_currency" SET DATA TYPE "public"."currency" USING "expenses_currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "total_area_unit" SET DATA TYPE "public"."surface_unit" USING "total_area_unit"::"public"."surface_unit";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "covered_area_unit" SET DATA TYPE "public"."surface_unit" USING "covered_area_unit"::"public"."surface_unit";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "condition" SET DATA TYPE "public"."property_condition" USING "condition"::"public"."property_condition";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "orientation" SET DATA TYPE "public"."orientation" USING "orientation"::"public"."orientation";--> statement-breakpoint
ALTER TABLE "ai_contents" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_property_queue" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "transfers_org_id_idx" ON "property_transfers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "transfers_to_user_idx" ON "property_transfers" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "transfers_from_user_idx" ON "property_transfers" USING btree ("from_user_id");--> statement-breakpoint
ALTER TABLE "ai_contents" ADD CONSTRAINT "ai_contents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_conversations" ADD CONSTRAINT "bot_conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_messages" ADD CONSTRAINT "bot_messages_conversation_id_bot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."bot_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_property_queue" ADD CONSTRAINT "lead_property_queue_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_property_queue" ADD CONSTRAINT "lead_property_queue_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_contents_org_created_by_idx" ON "ai_contents" USING btree ("organization_id","created_by_user_id");--> statement-breakpoint
CREATE INDEX "appointments_org_starts_idx" ON "appointments" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_org_created_by_idx" ON "appointments" USING btree ("organization_id","created_by_user_id");--> statement-breakpoint
CREATE INDEX "lpq_lead_sort_idx" ON "lead_property_queue" USING btree ("lead_id","sort_order");--> statement-breakpoint
CREATE INDEX "lpq_org_created_by_idx" ON "lead_property_queue" USING btree ("organization_id","created_by_user_id");--> statement-breakpoint
CREATE INDEX "leads_org_created_by_idx" ON "leads" USING btree ("organization_id","created_by_user_id");--> statement-breakpoint
CREATE INDEX "properties_org_created_by_idx" ON "properties" USING btree ("organization_id","created_by_user_id");