CREATE TYPE "public"."app_permission" AS ENUM('property.create', 'property.read_own', 'property.read_all', 'property.edit_own', 'property.edit_all', 'property.delete_own', 'property.delete_all', 'property.assign', 'lead.create', 'lead.read_own', 'lead.read_all', 'lead.edit_own', 'lead.edit_all', 'lead.delete_own', 'lead.delete_all', 'lead.assign', 'analytics.read_own', 'analytics.read_all', 'bot.read', 'bot.configure', 'settings.read', 'settings.manage', 'billing.manage');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."organization_plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"invited_by_user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"plan" "organization_plan" DEFAULT 'free' NOT NULL,
	"max_seats" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "member_role" NOT NULL,
	"permission" "app_permission" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_active_org" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "operation_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."operation_type";--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('sale', 'rent', 'short_term', 'antichretic');--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "operation_type" SET DATA TYPE "public"."operation_type" USING "operation_type"::"public"."operation_type";--> statement-breakpoint
ALTER TABLE "platform_admins" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_org" ADD CONSTRAINT "user_active_org_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_status_idx" ON "invitation" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "member_user_org_unique" ON "member" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_deleted_at_idx" ON "member" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "organization_deleted_at_idx" ON "organization" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_perm_unique" ON "role_permissions" USING btree ("role","permission");--> statement-breakpoint

-- ─── Cross-schema FKs to auth.users (added manually — Drizzle does not express them) ───
ALTER TABLE "member"
  ADD CONSTRAINT "member_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;--> statement-breakpoint

ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_invited_by_user_id_auth_users_fk"
  FOREIGN KEY ("invited_by_user_id") REFERENCES auth.users(id) ON DELETE SET NULL;--> statement-breakpoint

ALTER TABLE "user_active_org"
  ADD CONSTRAINT "user_active_org_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;--> statement-breakpoint

ALTER TABLE "platform_admins"
  ADD CONSTRAINT "platform_admins_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;