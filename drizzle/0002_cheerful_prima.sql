CREATE TABLE "lead_property_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"property_id" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"estimated_send_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
