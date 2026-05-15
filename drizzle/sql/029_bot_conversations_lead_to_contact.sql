-- ============================================================================
-- 029 — bot_conversations.lead_id → contact_id (Fase 8 R35)
-- ============================================================================
--
-- Switches the bot_conversations FK from the legacy `leads` table to the
-- post-R12 `contact` table. R12 created `contact` but deferred this rename
-- so the Drizzle TS schema + feature code (features/bot) could move
-- together — see sub-plan §3.4 and the R9 deferral note.
--
-- Backfill: NOT NEEDED in dev (zero bot_conversations rows). In prod, if
-- this migration ever runs against existing data, the same lead → contact
-- mapping logic used by `drizzle/sql/027` would apply (phone-normalized
-- regexp_replace + email lowercase). The current bot_conversations rows
-- being zero is verified ahead of apply.
--
-- Steps:
--   1. Drop old FK to `leads`
--   2. Drop old index `bot_conv_lead_id_idx`
--   3. RENAME column `lead_id` → `contact_id`
--   4. Add FK → `contact(id) ON DELETE CASCADE`
--   5. Add index `bot_conv_contact_id_idx`
-- ============================================================================

ALTER TABLE public.bot_conversations
  DROP CONSTRAINT IF EXISTS bot_conversations_lead_id_fkey;

DROP INDEX IF EXISTS bot_conv_lead_id_idx;

ALTER TABLE public.bot_conversations
  RENAME COLUMN lead_id TO contact_id;

ALTER TABLE public.bot_conversations
  ADD CONSTRAINT bot_conversations_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES public.contact(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS bot_conv_contact_id_idx
  ON public.bot_conversations(contact_id);
