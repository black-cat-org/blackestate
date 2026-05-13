-- Sub-plan QA Lote 9 — Soft-delete audit columns
--
-- Adds `deleted_by_user_id`, `deleted_by_user_name`, `deleted_by_user_email`
-- to every domain soft-delete table so the trash UI can show "who deleted
-- this row" without joining `auth.users` on every read.
--
-- Pattern follows the project's "data lives where queried" rule
-- (CLAUDE.md → Multitenancy ZERO TOLERANCE):
--   - `deleted_by_user_id` is a real FK to `auth.users(id) ON DELETE SET NULL`.
--     Survives user account deletion (the audit row remains, the FK clears).
--   - `deleted_by_user_name` and `deleted_by_user_email` are denormalized
--     snapshots of the user at the moment of deletion. They never change
--     after a soft delete. Required for the trash UI display path.
--
-- All three columns are nullable because rows soft-deleted before this
-- migration ran (and any future system-driven deletes) won't have a user
-- attached.

alter table public.properties
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.leads
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.appointments
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.ai_contents
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.lead_property_queue
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.bot_config
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.bot_conversations
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.bot_messages
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;

alter table public.agent_profiles
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_user_name text,
  add column if not exists deleted_by_user_email text;
