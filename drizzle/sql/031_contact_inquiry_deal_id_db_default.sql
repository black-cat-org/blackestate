-- Migration 031: DB-side default for contact / inquiry / deal `id`
--
-- Why
-- ---
-- The Drizzle schemas declare `id: text(...).primaryKey().$defaultFn(() => crypto.randomUUID())`
-- which generates UUIDs in the application layer at insert time. That works
-- fine for paths going through Drizzle (`db.insert(...)`), but it does NOT
-- protect SQL paths that bypass the ORM:
--   - SECURITY DEFINER RPCs (e.g. `public.public_create_inquiry` from
--     `028_public_create_inquiry_rpc.sql`, which writes
--     `INSERT INTO public.contact (...columns without id...)`).
--   - Future seed scripts, manual SQL fixes, admin tooling.
--
-- Symptom: `null value in column "id" of relation "contact" violates
-- not-null constraint` — surfaced in production by the public landing
-- form on `/p/[id]` (R47 Playwright smoke).
--
-- Fix: add a Postgres-side DEFAULT so any path that omits the column
-- still gets a UUID. Drizzle inserts continue to send their own value;
-- the default only fires when the value is omitted in the INSERT list.
--
-- This is defense-in-depth for the schema, NOT a workaround for the
-- specific RPC bug. The RPC is left untouched: it benefits from the
-- default automatically without changing its signature.
--
-- Re-apply semantics
-- ------------------
-- `ALTER COLUMN ... SET DEFAULT` overwrites the column default expression
-- with the value supplied, regardless of any prior default. Re-running
-- this migration is therefore safe — no data is touched, no error is
-- raised — but it is NOT a strict no-op (Postgres re-executes the
-- statement). In normal operation, `supabase_migrations.schema_migrations`
-- deduplicates by migration name and prevents a second apply; the
-- re-apply path only matters for ad-hoc replays (manual psql, disaster
-- recovery, environment seeding).

alter table public.contact alter column id set default gen_random_uuid()::text;
alter table public.inquiry alter column id set default gen_random_uuid()::text;
alter table public.deal    alter column id set default gen_random_uuid()::text;

comment on column public.contact.id is
  'Text PK. Default `gen_random_uuid()::text` set at DB level (031). Drizzle still emits its own UUID via $defaultFn — the default only fires for SQL paths that bypass the ORM (RPCs, seeds, manual fixes).';
comment on column public.inquiry.id is
  'Text PK. Default `gen_random_uuid()::text` set at DB level (031). Drizzle still emits its own UUID via $defaultFn — the default only fires for SQL paths that bypass the ORM (RPCs, seeds, manual fixes).';
comment on column public.deal.id is
  'Text PK. Default `gen_random_uuid()::text` set at DB level (031). Drizzle still emits its own UUID via $defaultFn — the default only fires for SQL paths that bypass the ORM (RPCs, seeds, manual fixes).';
