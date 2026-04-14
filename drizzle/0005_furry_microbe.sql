CREATE TABLE "bot_config" (
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
	CONSTRAINT "bot_config_organization_id_unique" UNIQUE("organization_id")
);
