-- 026_contact_inquiry_deal_refactor.sql
-- Sub-plan: docs/plans/2026-05-13-contact-inquiry-refactor.md
--
-- Creates the `contact`, `deal`, `inquiry`, and `contact_property_queue`
-- tables that replace the mono-table `leads` model with the industry-standard
-- Contact + Inquiry + Deal split (mirror of Salesforce Propertybase /
-- HubSpot). Includes:
--
--   1. Four pgEnum types (deal_stage, deal_source, inquiry_status,
--      inquiry_source).
--   2. Four tables with full column set, FKs (forward + back-link with
--      SET NULL semantics for the bidirectional Inquiry ↔ Deal pair),
--      partial indexes that Drizzle Kit cannot express, and partial
--      UNIQUE constraints that anchor the dedup invariants.
--   3. RLS policies mirroring the existing leads pattern (5 policies per
--      table) with the membership-check defense-in-depth from
--      `017a_domain_rls_membership_check.sql`. Special: `contact` SELECT
--      policies are org-wide for `authenticated` (not agent-scoped) so
--      cross-agent dedup works — see Section 4 contact block for the
--      rationale.
--   4. Data migration: legacy `leads` rows are repartitioned into
--      `contact` + (`deal` OR `inquiry`) according to the rule in
--      sub-plan §3.3 — leads with an appointment or terminal status
--      become Deals; the rest become Inquiries.
--
-- DEFERRED to later migrations (sub-plan §3.4 / R34 / R35):
--   - `appointments.lead_id` → `deal_id` rename
--   - `lead_property_queue` → `contact_property_queue` rename
--   - `bot_conversations.lead_id` → `contact_id` rename
--
-- Those FK switches must land together with their TS schema changes
-- (deferred to R8/R9 → R34/R35 per the plan) so the build does not
-- break mid-refactor. They are NOT part of this script. The legacy
-- tables (`leads`, `lead_property_queue`) keep operating in parallel
-- with the new tables and are dropped in R46 (Fase 10).
--
-- Idempotency: this script runs in a single transaction. If any step
-- fails, ROLLBACK leaves the database untouched. Re-running after
-- success requires manual cleanup (DROP TYPE / DROP TABLE) — the
-- migration is a one-shot DDL operation per environment.

BEGIN;

-- ============================================================================
-- SECTION 1 — Enums
-- ============================================================================

CREATE TYPE public.deal_stage AS ENUM (
  'visit_scheduled',
  'negotiation',
  'reserved',
  'won',
  'lost'
);

CREATE TYPE public.deal_source AS ENUM (
  'facebook',
  'instagram',
  'whatsapp',
  'tiktok',
  'google',
  'referral',
  'direct'
);

CREATE TYPE public.inquiry_status AS ENUM (
  'open',
  'discarded',
  'promoted'
);

CREATE TYPE public.inquiry_source AS ENUM (
  'public_form',
  'bot',
  'manual',
  'whatsapp',
  'facebook',
  'instagram',
  'tiktok',
  'google',
  'referral',
  'direct'
);

-- ============================================================================
-- SECTION 2 — Tables
-- ============================================================================

-- ─── contact ──────────────────────────────────────────────────────────────
CREATE TABLE public.contact (
  id                          text PRIMARY KEY,
  organization_id             uuid NOT NULL,
  created_by_user_id          uuid NOT NULL,
  name                        text NOT NULL,
  phone                       text,
  email                       text,
  notes                       text,
  tags                        text[] NOT NULL DEFAULT '{}',
  preferred_channel           text,
  catalog_sent_with_origin    boolean NOT NULL DEFAULT false,
  catalog_opened_at           timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz,
  deleted_by_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by_user_name        text,
  deleted_by_user_email       text
);

CREATE INDEX contact_org_id_idx
  ON public.contact (organization_id);
CREATE INDEX contact_org_created_by_idx
  ON public.contact (organization_id, created_by_user_id);

-- Partial / functional indexes (TS schema cannot express these natively;
-- they live here per sub-plan §2.1 and the file-level JSDoc in
-- `lib/db/schema/contact.ts`).
--
-- NOTE on `contact_org_email_idx`: this is a functional index on
-- `lower(email)`. Application queries MUST use `lower(email) = lower($1)`
-- (or `ILIKE`) to hit this index. The infra layer (R17 — the contact
-- repository adapter) normalises with `lower()` at every read path; if
-- a future query uses raw `email = $1`, the index is bypassed and the
-- query degrades to a sequential scan over the org's contacts.
CREATE INDEX contact_org_phone_idx
  ON public.contact (organization_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX contact_org_email_idx
  ON public.contact (organization_id, lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX contact_active_org_idx
  ON public.contact (organization_id)
  WHERE deleted_at IS NULL;

-- ─── deal ─────────────────────────────────────────────────────────────────
CREATE TABLE public.deal (
  id                          text PRIMARY KEY,
  organization_id             uuid NOT NULL,
  created_by_user_id          uuid NOT NULL,
  contact_id                  text NOT NULL
                                REFERENCES public.contact(id) ON DELETE CASCADE,
  property_id                 text NOT NULL
                                REFERENCES public.properties(id) ON DELETE CASCADE,
  -- inquiry_id FK added in SECTION 3 once `inquiry` exists.
  inquiry_id                  text,
  stage                       public.deal_stage NOT NULL DEFAULT 'visit_scheduled',
  stage_order                 integer NOT NULL DEFAULT 0,
  source                      public.deal_source,
  budget                      text,
  message                     text,
  property_type_sought        text,
  zone_of_interest            text,
  wants_offers                boolean NOT NULL DEFAULT false,
  expected_close_at           timestamptz,
  closed_at                   timestamptz,
  lost_reason                 text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz,
  deleted_by_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by_user_name        text,
  deleted_by_user_email       text
);

CREATE INDEX deal_org_id_idx
  ON public.deal (organization_id);
CREATE INDEX deal_property_id_idx
  ON public.deal (property_id);
CREATE INDEX deal_contact_id_idx
  ON public.deal (contact_id);
CREATE INDEX deal_org_stage_idx
  ON public.deal (organization_id, stage);
CREATE INDEX deal_org_created_by_idx
  ON public.deal (organization_id, created_by_user_id);

-- Partial UNIQUE: a Contact can have at most one *active* Deal per Property.
-- `won`/`lost` are terminal so a new opportunity on the same pair is allowed
-- afterwards.
CREATE UNIQUE INDEX deal_unique_active_contact_property
  ON public.deal (organization_id, contact_id, property_id)
  WHERE deleted_at IS NULL AND stage NOT IN ('won', 'lost');

-- Partial index for Kanban hot path: scoped to active (non-terminal) Deals.
CREATE INDEX deal_active_org_idx
  ON public.deal (organization_id)
  WHERE deleted_at IS NULL AND stage NOT IN ('won', 'lost');

-- ─── inquiry ──────────────────────────────────────────────────────────────
CREATE TABLE public.inquiry (
  id                          text PRIMARY KEY,
  organization_id             uuid NOT NULL,
  created_by_user_id          uuid NOT NULL,
  contact_id                  text NOT NULL
                                REFERENCES public.contact(id) ON DELETE CASCADE,
  property_id                 text NOT NULL
                                REFERENCES public.properties(id) ON DELETE CASCADE,
  source                      public.inquiry_source,
  message                     text,
  status                      public.inquiry_status NOT NULL DEFAULT 'open',
  -- promoted_deal_id FK added in SECTION 3 (circular pair with deal.inquiry_id).
  promoted_deal_id            text,
  discarded_reason            text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz,
  deleted_by_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by_user_name        text,
  deleted_by_user_email       text
);

CREATE INDEX inquiry_org_id_idx
  ON public.inquiry (organization_id);
CREATE INDEX inquiry_contact_id_idx
  ON public.inquiry (contact_id);
CREATE INDEX inquiry_property_id_idx
  ON public.inquiry (property_id);
CREATE INDEX inquiry_org_status_idx
  ON public.inquiry (organization_id, status);
CREATE INDEX inquiry_org_created_by_idx
  ON public.inquiry (organization_id, created_by_user_id);

-- Partial UNIQUE: at most one *open* Inquiry per Contact+Property.
-- Discarded/promoted Inquiries do not block — they represent past
-- interest; renewed interest creates a new `open` Inquiry.
CREATE UNIQUE INDEX inquiry_unique_open_contact_property
  ON public.inquiry (organization_id, contact_id, property_id)
  WHERE deleted_at IS NULL AND status = 'open';

-- ─── contact_property_queue ───────────────────────────────────────────────
CREATE TABLE public.contact_property_queue (
  id                          text PRIMARY KEY,
  organization_id             uuid NOT NULL,
  created_by_user_id          uuid NOT NULL,
  contact_id                  text NOT NULL
                                REFERENCES public.contact(id) ON DELETE CASCADE,
  property_id                 text NOT NULL
                                REFERENCES public.properties(id) ON DELETE CASCADE,
  status                      public.queue_item_status NOT NULL DEFAULT 'pending',
  sort_order                  integer NOT NULL DEFAULT 0,
  estimated_send_at           timestamptz,
  sent_at                     timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz,
  deleted_by_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by_user_name        text,
  deleted_by_user_email       text
);

CREATE INDEX cpq_contact_id_idx
  ON public.contact_property_queue (contact_id);
CREATE INDEX cpq_property_id_idx
  ON public.contact_property_queue (property_id);
CREATE INDEX cpq_org_id_idx
  ON public.contact_property_queue (organization_id);
CREATE INDEX cpq_contact_sort_idx
  ON public.contact_property_queue (contact_id, sort_order);
CREATE INDEX cpq_org_created_by_idx
  ON public.contact_property_queue (organization_id, created_by_user_id);

-- ============================================================================
-- SECTION 3 — Bidirectional Inquiry ↔ Deal cross-FKs
-- ============================================================================
--
-- ON DELETE SET NULL on both sides — sub-plan §2.1c / §2.2 / EC16:
-- if either row is ever hard-deleted, the surviving row keeps its data
-- intact with the FK column nulled out. The audit trail of "expressed
-- interest" or "commercial opportunity" stands on its own beyond the
-- lifecycle of the partner row. Inverse of the contact_id / property_id
-- cascade above, where hard-deleting an identity row legitimately
-- invalidates downstream Inquiries / Deals.

ALTER TABLE public.deal
  ADD CONSTRAINT deal_inquiry_id_fkey
  FOREIGN KEY (inquiry_id) REFERENCES public.inquiry(id) ON DELETE SET NULL;

ALTER TABLE public.inquiry
  ADD CONSTRAINT inquiry_promoted_deal_id_fkey
  FOREIGN KEY (promoted_deal_id) REFERENCES public.deal(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 4 — RLS Policies
-- ============================================================================
--
-- Mirror of `017a_domain_rls_membership_check.sql` pattern: every domain
-- table gets the membership defense-in-depth via `public.is_org_member()`.
-- Five policies per table:
--   1. SELECT org      — non-deleted rows, role-aware visibility
--   2. SELECT trash    — soft-deleted rows, role-aware visibility
--   3. INSERT org      — caller authors their own rows in their active org
--   4. UPDATE role     — role-aware mutation on non-deleted rows
--   5. UPDATE restore  — role-aware mutation on soft-deleted rows
--
-- Super-admin bypass on SELECT and UPDATE restore is preserved.
--
-- contact deviates from the pattern: SELECT is org-wide (no
-- `created_by_user_id = auth.uid()` agent filter). See contact block
-- below for the rationale (org-wide dedup requirement).

-- ─── contact ──────────────────────────────────────────────────────────────
-- Visibility deviation from the leads/deal/inquiry pattern:
--
-- Contact is the PERSON IDENTITY of someone the organisation interacts
-- with — not a per-agent asset. The same Carlos López might be touched
-- by Alice (form), Bob (bot conversation), Carmen (referral). The
-- find-or-create dedup at the use-case level (R17) must be able to see
-- the org's full Contact roster to detect duplicates; otherwise Agent B
-- never sees Alice's "Carlos López" and creates a duplicate.
--
-- The policy therefore opens SELECT org-wide to every org member.
-- UPDATE remains agent-scoped (an agent edits only their own contacts;
-- owner/admin edits any) so write authority is not diluted.

ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact FORCE ROW LEVEL SECURITY;

CREATE POLICY contact_select_org ON public.contact
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
    )
  );

CREATE POLICY contact_select_trash ON public.contact
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY contact_insert_org ON public.contact
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY contact_update_role_aware ON public.contact
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND (
      ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
      OR created_by_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

CREATE POLICY contact_update_restore ON public.contact
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

-- ─── deal ─────────────────────────────────────────────────────────────────
ALTER TABLE public.deal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal FORCE ROW LEVEL SECURITY;

CREATE POLICY deal_select_org ON public.deal
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY deal_select_trash ON public.deal
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY deal_insert_org ON public.deal
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY deal_update_role_aware ON public.deal
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND (
      ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
      OR created_by_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

CREATE POLICY deal_update_restore ON public.deal
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

-- ─── inquiry ──────────────────────────────────────────────────────────────
ALTER TABLE public.inquiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry FORCE ROW LEVEL SECURITY;

CREATE POLICY inquiry_select_org ON public.inquiry
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY inquiry_select_trash ON public.inquiry
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY inquiry_insert_org ON public.inquiry
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY inquiry_update_role_aware ON public.inquiry
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND (
      ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
      OR created_by_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

CREATE POLICY inquiry_update_restore ON public.inquiry
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

-- ─── contact_property_queue ───────────────────────────────────────────────
ALTER TABLE public.contact_property_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_property_queue FORCE ROW LEVEL SECURITY;

CREATE POLICY cpq_select_org ON public.contact_property_queue
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY cpq_select_trash ON public.contact_property_queue
  FOR SELECT TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY cpq_insert_org ON public.contact_property_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND created_by_user_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY cpq_update_role_aware ON public.contact_property_queue
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
    AND deleted_at IS NULL
    AND (
      ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
      OR created_by_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

CREATE POLICY cpq_update_restore ON public.contact_property_queue
  FOR UPDATE TO authenticated
  USING (
    ((SELECT ((auth.jwt() ->> 'is_super_admin'::text))::boolean) IS TRUE)
    OR (
      organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
      AND public.is_org_member(organization_id)
      AND deleted_at IS NOT NULL
      AND (
        ((SELECT (auth.jwt() ->> 'org_role'::text)) = ANY (ARRAY['owner'::text, 'admin'::text]))
        OR created_by_user_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT ((auth.jwt() ->> 'active_org_id'::text))::uuid)
    AND public.is_org_member(organization_id)
  );

-- ============================================================================
-- SECTION 5 — Data Migration (legacy `leads` → contact + inquiry/deal)
-- ============================================================================
--
-- Applies sub-plan §3 algorithm. In dev (no real data) this is a no-op —
-- every query selects zero rows from `public.leads`. In staging/prod
-- with data, the same script repartitions legacy leads deterministically.
--
-- ⚠️  Execution role / RLS: this DML runs as the `postgres` superuser
-- (the DATABASE_URL role used by `drizzle-kit migrate` and Supabase
-- MCP `apply_migration`). `postgres` has `rolbypassrls = true`, so
-- ENABLE/FORCE RLS on `contact` / `deal` / `inquiry` does NOT apply to
-- these INSERTs.
--
-- Note on CLAUDE.md scope: the `withRLS` / `withAnon` rule and its
-- "Documented exceptions" list both govern *application-layer* runtime
-- queries (Next.js server actions, repositories, edge functions). One-
-- shot DDL+seed migrations run by the migration tooling are outside
-- that layer entirely — they are not subject to the rule and do not
-- need to be enumerated as an "exception". The role-level bypass is
-- a property of the migration runner, not a runtime carve-out.
--
-- All other writes against these tables from inside the running
-- application MUST go through `withRLS()` per the standard rule.
--
-- Two helper temp tables:
--
--   `_migration_groups` — one row per (organization_id, group_key)
--     person group, with a pre-generated `new_contact_id`. Pre-generating
--     UUIDs at the grouping stage eliminates the race risk of looking up
--     freshly-inserted contacts back by `(org_id, created_at, phone, email)`
--     — when two NULL-NULL groups in the same org happen to share a
--     `min(created_at)` microsecond, a re-join would either fail (PK
--     conflict on `_migration_lead_to_contact`) or mispair.
--
--   `_migration_lead_to_contact` — flat lead_id → contact_id mapping used
--     by the deal / inquiry insert steps below.

CREATE TEMP TABLE _migration_groups (
  organization_id    uuid NOT NULL,
  group_key          text NOT NULL,
  lead_ids           text[] NOT NULL,
  earliest_creator   uuid NOT NULL,
  display_name       text,
  phone              text,
  email              text,
  contact_created_at timestamptz NOT NULL,
  new_contact_id     text NOT NULL,
  PRIMARY KEY (organization_id, group_key)
);

CREATE TEMP TABLE _migration_lead_to_contact (
  lead_id    text PRIMARY KEY,
  contact_id text NOT NULL
);

-- Step 1 — group leads by person.
--
-- IMPORTANT: includes soft-deleted leads (no `deleted_at` filter). Per
-- sub-plan EC4 / MIG8, soft-deleted leads still need a contact row so
-- their downstream inquiry/deal can be inserted (soft-deleted) and the
-- trash view remains coherent. The contact itself stays non-deleted
-- because the person identity outlives any individual interaction.
--
-- Aggregate notes:
--   - `display_name` picks the most recent non-NULL name. For very
--     fragmented capture (e.g. a nickname captured later overrides a
--     full name captured earlier), the result may not be the most
--     complete string. The agent can edit later from the contact UI.
--     This is a deliberate trade-off vs. "longest string wins" because
--     "most recent" is more deterministic and easier to reason about.
--   - `phone` and `email` are normalised before grouping (E.164-ish for
--     phone, lowercased+trimmed for email).
INSERT INTO _migration_groups (
  organization_id, group_key, lead_ids, earliest_creator,
  display_name, phone, email, contact_created_at, new_contact_id
)
SELECT
  organization_id,
  group_key,
  array_agg(lead_id ORDER BY created_at) AS lead_ids,
  -- Postgres aggregate syntax: `fn(expr ORDER BY ...) FILTER (WHERE ...)`.
  -- The within-group ORDER BY lives inside the aggregate call; the
  -- FILTER clause comes AFTER the closing paren. Placing ORDER BY
  -- outside the aggregate is a syntax error (`ORDER BY` is not a
  -- SELECT-list construct).
  --
  -- Ordering policy:
  --   - `earliest_creator`, `phone`, `email`: ORDER BY created_at ASC →
  --     first non-NULL captured wins. Stable audit trail (the agent
  --     who first touched the person stays as the contact owner; the
  --     first phone/email number we collected stays as canonical).
  --   - `display_name`: ORDER BY created_at DESC → most recent non-NULL
  --     name wins, so a corrected nickname / full-name supersedes an
  --     earlier capture. Trade-off documented in the comment block
  --     above this INSERT.
  (array_agg(created_by_user_id ORDER BY created_at))[1] AS earliest_creator,
  (array_agg(name ORDER BY created_at DESC) FILTER (WHERE name IS NOT NULL))[1] AS display_name,
  (array_agg(phone_norm ORDER BY created_at) FILTER (WHERE phone_norm IS NOT NULL))[1] AS phone,
  (array_agg(email_norm ORDER BY created_at) FILTER (WHERE email_norm IS NOT NULL))[1] AS email,
  min(created_at) AS contact_created_at,
  gen_random_uuid()::text AS new_contact_id
FROM (
  SELECT
    l.id AS lead_id,
    l.organization_id,
    l.created_by_user_id,
    l.name,
    NULLIF(regexp_replace(coalesce(l.phone, ''), '[^0-9+]', '', 'g'), '') AS phone_norm,
    NULLIF(lower(trim(coalesce(l.email, ''))), '') AS email_norm,
    l.created_at,
    coalesce(
      NULLIF(regexp_replace(coalesce(l.phone, ''), '[^0-9+]', '', 'g'), ''),
      NULLIF(lower(trim(coalesce(l.email, ''))), ''),
      l.id
    ) AS group_key
  FROM public.leads l
) normalized
GROUP BY organization_id, group_key;

-- Step 2 — insert contacts from the pre-grouped temp table.
INSERT INTO public.contact (
  id, organization_id, created_by_user_id, name, phone, email,
  created_at, updated_at
)
SELECT
  g.new_contact_id,
  g.organization_id,
  g.earliest_creator,
  COALESCE(NULLIF(trim(g.display_name), ''), 'Sin nombre'),
  g.phone,
  g.email,
  g.contact_created_at,
  g.contact_created_at
FROM _migration_groups g;

-- Step 2b — populate lead_id → contact_id mapping. `unnest(lead_ids)`
-- expands each group's array to one row per member; the `new_contact_id`
-- is the same for every member of the same group.
INSERT INTO _migration_lead_to_contact (lead_id, contact_id)
SELECT unnest(g.lead_ids), g.new_contact_id
FROM _migration_groups g;

-- Step 3a — Deals: leads with an active appointment OR terminal status
-- (won/lost). The Deal inherits identity (`id = lead.id`) and adds funnel
-- metadata.
INSERT INTO public.deal (
  id, organization_id, created_by_user_id, contact_id, property_id,
  inquiry_id, stage, stage_order, source, budget, message,
  property_type_sought, zone_of_interest, wants_offers,
  closed_at, lost_reason,
  created_at, updated_at, deleted_at,
  deleted_by_user_id, deleted_by_user_name, deleted_by_user_email
)
SELECT
  l.id,
  l.organization_id,
  l.created_by_user_id,
  m.contact_id,
  l.property_id,
  NULL AS inquiry_id,
  CASE
    WHEN l.status = 'won' THEN 'won'::public.deal_stage
    WHEN l.status = 'lost' THEN 'lost'::public.deal_stage
    ELSE 'visit_scheduled'::public.deal_stage
  END AS stage,
  0 AS stage_order,
  l.source::text::public.deal_source AS source,
  l.budget, l.message, l.property_type_sought, l.zone_of_interest,
  l.wants_offers,
  CASE WHEN l.status IN ('won', 'lost') THEN l.updated_at ELSE NULL END,
  NULL,
  l.created_at, l.updated_at, l.deleted_at,
  l.deleted_by_user_id, l.deleted_by_user_name, l.deleted_by_user_email
FROM public.leads l
JOIN _migration_lead_to_contact m ON m.lead_id = l.id
WHERE
  l.status IN ('won', 'lost')
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.lead_id = l.id
      AND a.deleted_at IS NULL
      AND (a.status IS NULL OR a.status NOT IN ('cancelled'))
  );

-- Recompute stage_order for ACTIVE, NON-DELETED deals only. Two filters
-- combine to make the MIG10 invariant ("dense 0..N-1 per (org, active
-- stage) over live rows") hold without gaps:
--   - `stage NOT IN ('won','lost')` — terminal deals leave the Kanban,
--     their `stage_order` is unused. Default `0` is fine.
--   - `deleted_at IS NULL` — soft-deleted active-stage deals are also
--     invisible on the Kanban; numbering them would inject gaps into
--     the live sequence (e.g. live deals end up with stage_order
--     `0, 2, 3` if a soft-deleted row claims `1`), breaking MIG10
--     which scopes its assertion to `deleted_at IS NULL`.
-- The UPDATE's join on `d.id = sub.id` ensures rows excluded from
-- `sub` keep their inserted default `stage_order = 0`.
UPDATE public.deal d
SET stage_order = sub.row_number
FROM (
  SELECT
    id,
    row_number() OVER (PARTITION BY organization_id, stage ORDER BY created_at) - 1 AS row_number
  FROM public.deal
  WHERE stage NOT IN ('won', 'lost') AND deleted_at IS NULL
) sub
WHERE d.id = sub.id;

-- Step 3b — Inquiries: every remaining lead (no appointment + non-terminal
-- status, or discarded).
INSERT INTO public.inquiry (
  id, organization_id, created_by_user_id, contact_id, property_id,
  source, message, status, promoted_deal_id, discarded_reason,
  created_at, updated_at, deleted_at,
  deleted_by_user_id, deleted_by_user_name, deleted_by_user_email
)
SELECT
  l.id,
  l.organization_id,
  l.created_by_user_id,
  m.contact_id,
  l.property_id,
  l.source::text::public.inquiry_source,
  l.message,
  CASE
    WHEN l.status = 'discarded' THEN 'discarded'::public.inquiry_status
    ELSE 'open'::public.inquiry_status
  END,
  NULL,
  CASE WHEN l.status = 'discarded' THEN 'migrated_from_discarded_lead' ELSE NULL END,
  l.created_at, l.updated_at, l.deleted_at,
  l.deleted_by_user_id, l.deleted_by_user_name, l.deleted_by_user_email
FROM public.leads l
JOIN _migration_lead_to_contact m ON m.lead_id = l.id
WHERE NOT EXISTS (SELECT 1 FROM public.deal d WHERE d.id = l.id);

-- Step 4 — Helper cleanup. The TEMP tables drop on COMMIT anyway, but
-- explicit DROP keeps the script auditable.
DROP TABLE _migration_lead_to_contact;
DROP TABLE _migration_groups;

COMMIT;
