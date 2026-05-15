-- ============================================================================
-- 027 — appointments.lead_id → deal_id (Fase 8 R34)
-- ============================================================================
--
-- Switches the appointments FK from the legacy `leads` table to the post-R12
-- `deal` table. R12 created the deal entity but deferred this rename so the
-- Drizzle TS schema + feature code (features/appointments) could move
-- together — see sub-plan §3.4 and the R8 deferral note.
--
-- Backfill challenge:
--   R12 created deals at the LEAD level ("one deal per lead with an active
--   appointment or terminal status"). Appointments live at the
--   (lead, property) level, so a lead with appointments on multiple
--   properties has only ONE matching deal — the rest are orphans
--   without a (contact, property) deal. In the current dev DB, 6 of 8
--   appointments fall in this orphan bucket.
--
--   Resolution: for every orphan (contact, property) pair, AUTO-CREATE a
--   deal at the default stage `visit_scheduled`. This preserves the
--   invariant "every appointment links to a deal" and reflects the real
--   semantic — scheduling a visit IS the act that produces a deal in this
--   funnel. After migration, agents can re-stage from the Kanban UI as
--   needed.
--
-- Steps:
--   1. ADD `deal_id` column nullable + FK to deal
--   2. Build temp mapping appointment_id → deal_id via lead → contact → deal
--   3. INSERT new deals for orphan (contact, property) pairs
--   4. Extend mapping with new-deal entries
--   5. UPDATE appointments.deal_id from mapping
--   6. Verify zero NULLs, set NOT NULL
--   7. Drop old lead_id FK, index, column
--   8. Add appointments_deal_id_idx
--
-- Idempotent guards (`IF EXISTS` / `IF NOT EXISTS`) so a re-run after a
-- partial failure does not crash, but a successful run only fires once
-- (the column drop is the irreversible gate).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Step 1: ADD deal_id (nullable transitional) + FK
-- ----------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deal_id text;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_deal_id_fkey;

-- IMMEDIATE FK enforcement (no DEFERRABLE): each UPDATE in step 5 must see
-- its target deal exist at statement time. Since step 3 inserts the new
-- deals BEFORE step 5 updates appointments, IMMEDIATE works. Using
-- DEFERRABLE INITIALLY DEFERRED conflicts with the ALTER COLUMN SET NOT
-- NULL in step 6 because pending trigger events block table-level ALTERs
-- (Postgres SQLSTATE 55006 "cannot ALTER TABLE because it has pending
-- trigger events").
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_deal_id_fkey
  FOREIGN KEY (deal_id) REFERENCES public.deal(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- Step 2: Build mapping table appointment_id → deal_id via existing deals
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _apt_deal_map (
  appointment_id text PRIMARY KEY,
  deal_id text NOT NULL
) ON COMMIT DROP;

INSERT INTO _apt_deal_map (appointment_id, deal_id)
SELECT DISTINCT ON (a.id) a.id, d.id
FROM public.appointments a
JOIN public.leads l ON l.id = a.lead_id
JOIN public.contact c
  ON c.organization_id = a.organization_id
  AND (
    (l.phone IS NOT NULL AND c.phone = NULLIF(regexp_replace(l.phone, '[^0-9+]', '', 'g'), ''))
    OR (l.email IS NOT NULL AND lower(c.email) = lower(l.email))
  )
JOIN public.deal d
  ON d.contact_id = c.id
  AND d.property_id = a.property_id
  AND d.organization_id = a.organization_id
ORDER BY a.id, d.created_at ASC;

-- ----------------------------------------------------------------------------
-- Step 3: Auto-create deals for orphan (contact, property) pairs
-- ----------------------------------------------------------------------------
-- Identify unique (contact, property, org, creator) tuples that need a deal.
-- The creator is taken from the most-recent appointment for that pair so the
-- new deal is owned by whoever last scheduled.
WITH orphan_pairs AS (
  SELECT DISTINCT ON (c.id, a.property_id, a.organization_id)
    a.organization_id,
    a.created_by_user_id,
    c.id AS contact_id,
    a.property_id
  FROM public.appointments a
  JOIN public.leads l ON l.id = a.lead_id
  JOIN public.contact c
    ON c.organization_id = a.organization_id
    AND (
      (l.phone IS NOT NULL AND c.phone = NULLIF(regexp_replace(l.phone, '[^0-9+]', '', 'g'), ''))
      OR (l.email IS NOT NULL AND lower(c.email) = lower(l.email))
    )
  WHERE NOT EXISTS (
    SELECT 1 FROM _apt_deal_map m WHERE m.appointment_id = a.id
  )
  ORDER BY c.id, a.property_id, a.organization_id, a.starts_at DESC
),
stage_orders AS (
  -- Compute the next stage_order for the visit_scheduled column per org
  -- BEFORE inserting, so concurrent inserts in this CTE don't collide.
  SELECT
    op.organization_id,
    op.created_by_user_id,
    op.contact_id,
    op.property_id,
    COALESCE(
      (
        SELECT MAX(d2.stage_order)
        FROM public.deal d2
        WHERE d2.organization_id = op.organization_id
          AND d2.stage = 'visit_scheduled'::deal_stage
      ),
      -1
    ) + ROW_NUMBER() OVER (
      PARTITION BY op.organization_id
      ORDER BY op.contact_id, op.property_id
    ) AS new_stage_order
  FROM orphan_pairs op
),
new_deals AS (
  INSERT INTO public.deal (
    id, organization_id, created_by_user_id,
    contact_id, property_id,
    stage, stage_order
  )
  SELECT
    gen_random_uuid()::text,
    so.organization_id,
    so.created_by_user_id,
    so.contact_id,
    so.property_id,
    'visit_scheduled'::deal_stage,
    so.new_stage_order
  FROM stage_orders so
  RETURNING id, contact_id, property_id, organization_id
)
-- ----------------------------------------------------------------------------
-- Step 4: Extend mapping with new-deal entries for orphan appointments
-- ----------------------------------------------------------------------------
INSERT INTO _apt_deal_map (appointment_id, deal_id)
SELECT DISTINCT ON (a.id) a.id, nd.id
FROM public.appointments a
JOIN public.leads l ON l.id = a.lead_id
JOIN public.contact c
  ON c.organization_id = a.organization_id
  AND (
    (l.phone IS NOT NULL AND c.phone = NULLIF(regexp_replace(l.phone, '[^0-9+]', '', 'g'), ''))
    OR (l.email IS NOT NULL AND lower(c.email) = lower(l.email))
  )
JOIN new_deals nd
  ON nd.contact_id = c.id
  AND nd.property_id = a.property_id
  AND nd.organization_id = a.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM _apt_deal_map m WHERE m.appointment_id = a.id
)
ORDER BY a.id, nd.id;

-- ----------------------------------------------------------------------------
-- Step 5: Apply mapping
-- ----------------------------------------------------------------------------
UPDATE public.appointments a
SET deal_id = m.deal_id
FROM _apt_deal_map m
WHERE a.id = m.appointment_id;

-- ----------------------------------------------------------------------------
-- Step 6: Verify 100% backfill, then set NOT NULL
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  missing_count int;
BEGIN
  SELECT count(*) INTO missing_count
  FROM public.appointments
  WHERE deal_id IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % appointments still have NULL deal_id', missing_count;
  END IF;
END
$$;

ALTER TABLE public.appointments
  ALTER COLUMN deal_id SET NOT NULL;

-- ----------------------------------------------------------------------------
-- Step 7: Drop old lead_id FK, index, column
-- ----------------------------------------------------------------------------
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_lead_id_fkey;

DROP INDEX IF EXISTS appointments_lead_id_idx;

ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS lead_id;

-- ----------------------------------------------------------------------------
-- Step 8: Add new index on deal_id (matches Drizzle schema R34)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS appointments_deal_id_idx
  ON public.appointments(deal_id);

COMMIT;
