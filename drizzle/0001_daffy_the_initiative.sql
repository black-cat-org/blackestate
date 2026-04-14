CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"status" text DEFAULT 'nuevo' NOT NULL,
	"message" text,
	"property_type_sought" text,
	"budget" text,
	"zone_of_interest" text,
	"wants_offers" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
