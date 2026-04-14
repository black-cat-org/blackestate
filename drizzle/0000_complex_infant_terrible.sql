CREATE TABLE IF NOT EXISTS"agent_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"bio" text,
	"whatsapp" text,
	"instagram" text,
	"facebook" text,
	"website" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"ai_contents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" text NOT NULL,
	"type" text NOT NULL,
	"platform" text,
	"text" text NOT NULL,
	"published_at" timestamp with time zone,
	"published_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"property_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'solicitada' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"bot_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"welcome_message" text DEFAULT '' NOT NULL,
	"appointment_duration" integer DEFAULT 60 NOT NULL,
	"reminder_hours_before" integer DEFAULT 2 NOT NULL,
	"schedule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "bot_config_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"bot_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"status" text DEFAULT 'activa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"bot_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"sender" text NOT NULL,
	"content_type" text DEFAULT 'text' NOT NULL,
	"text" text NOT NULL,
	"media_url" text,
	"property_id" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"lead_property_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"property_id" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"estimated_send_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"leads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"source" text,
	"status" text DEFAULT 'nuevo' NOT NULL,
	"message" text,
	"property_type_sought" text,
	"budget" text,
	"zone_of_interest" text,
	"wants_offers" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS"properties" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"short_description" text,
	"type" text NOT NULL,
	"operation_type" text NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"price_amount" numeric(14, 2) NOT NULL,
	"price_currency" text NOT NULL,
	"negotiable" boolean DEFAULT false NOT NULL,
	"expenses_amount" numeric(14, 2),
	"expenses_currency" text,
	"address_street" text NOT NULL,
	"address_number" text,
	"address_floor" text,
	"address_apartment" text,
	"address_city" text NOT NULL,
	"address_state" text NOT NULL,
	"address_country" text NOT NULL,
	"address_neighborhood" text,
	"address_lat" double precision,
	"address_lng" double precision,
	"address_google_maps_url" text,
	"total_area_value" real,
	"total_area_unit" text,
	"covered_area_value" real,
	"covered_area_unit" text,
	"rooms" integer,
	"bedrooms" integer,
	"bathrooms" integer,
	"garages" integer,
	"age" integer,
	"condition" text,
	"orientation" text,
	"amenities" text[] DEFAULT '{}' NOT NULL,
	"hide_exact_location" boolean DEFAULT true NOT NULL,
	"photos" text[] DEFAULT '{}' NOT NULL,
	"video_url" text,
	"virtual_tour_url" text,
	"blueprints" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS"agent_profiles_user_org_idx" ON "agent_profiles" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"ai_contents_org_id_idx" ON "ai_contents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"ai_contents_property_id_idx" ON "ai_contents" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"analytics_org_id_idx" ON "analytics_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"analytics_event_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"analytics_org_created_idx" ON "analytics_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"appointments_org_id_idx" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"appointments_lead_id_idx" ON "appointments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"appointments_starts_at_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"bot_conv_org_id_idx" ON "bot_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"bot_conv_lead_id_idx" ON "bot_conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"bot_msg_conversation_id_idx" ON "bot_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"bot_msg_org_id_idx" ON "bot_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"lpq_lead_id_idx" ON "lead_property_queue" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"lpq_org_id_idx" ON "lead_property_queue" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"leads_org_id_idx" ON "leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"leads_property_id_idx" ON "leads" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"leads_org_status_idx" ON "leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"properties_org_id_idx" ON "properties" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS"properties_org_status_idx" ON "properties" USING btree ("organization_id","status");