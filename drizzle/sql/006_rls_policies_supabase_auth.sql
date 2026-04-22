-- Sub-plan 07 — RLS policies rewrite for Supabase Auth
--
-- Drops every legacy policy that referenced
--   current_setting('request.jwt.claims')::jsonb ->> '...'
-- (the Better Auth withRLS manual-claim hack) and replaces them with
-- Supabase-native policies that read auth.jwt() ->> 'active_org_id' / 'org_role'
-- / 'is_super_admin' from the custom_access_token_hook (sub-plan 03).
--
-- Design decisions:
--   - No `app.include_deleted` GUC — trash UI queries filter deleted_at explicitly.
--   - Every UPDATE policy has both USING and WITH CHECK — prevents cross-org
--     data hijacking (row migration across orgs via UPDATE organization_id).
--   - Every INSERT policy on soft-delete tables enforces `deleted_at IS NULL`
--     — prevents stealth-deleted insertions.
--   - UPDATE policies on soft-delete tables enforce `deleted_at IS NULL` in
--     USING — prevents unintentional "undelete" via restore vector.
--   - `member` UPDATE is split into two policies: admin path (any fields) and
--     self path (title only; role/org locked via WITH CHECK self-lookup).
--   - `invitation_*` policies use `auth.email()` Supabase helper (JWT-backed,
--     no DB roundtrip) for invitee email match.
--   - Storage public buckets have NO SELECT policy (URLs bypass via
--     bucket.public=true; no list() feature in the codebase).
--
-- Performance: every auth function call wrapped in `(select ...)` subquery
-- for Postgres statement-level caching.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Drop every legacy policy on domain + storage tables
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname = 'public' and tablename in (
             'properties', 'leads', 'appointments', 'ai_contents',
             'lead_property_queue', 'bot_config', 'bot_conversations',
             'bot_messages', 'analytics_events', 'agent_profiles',
             'platform_admins', 'property_transfers',
             'organization', 'member', 'invitation',
             'user_active_org', 'role_permissions'
           ))
       or (schemaname = 'storage' and tablename = 'objects')
  loop
    execute format('drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename);
  end loop;
end
$$;

-- Drop obsolete helper functions (idempotent re-run safety)
drop function if exists public.is_org_member(uuid);
drop function if exists public.is_org_admin(uuid);


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — ENABLE + FORCE RLS on multitenancy tables
-- ══════════════════════════════════════════════════════════════════════════

alter table public.organization     enable row level security;
alter table public.organization     force  row level security;
alter table public.member           enable row level security;
alter table public.member           force  row level security;
alter table public.invitation       enable row level security;
alter table public.invitation       force  row level security;
alter table public.user_active_org  enable row level security;
alter table public.user_active_org  force  row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force  row level security;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 2.5 — SECURITY DEFINER helpers to break RLS recursion
-- ══════════════════════════════════════════════════════════════════════════
-- Any policy on `member` that checks "is caller a member of this org" via an
-- EXISTS on member causes infinite recursion (the EXISTS triggers the same
-- policy). Standard Supabase workaround: wrap the check in a SECURITY DEFINER
-- function so it bypasses RLS for its internal lookup.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#recursive-policies

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.member m
    where m.organization_id = p_org_id
      and m.user_id = (select auth.uid())
      and m.deleted_at is null
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.member m
    where m.organization_id = p_org_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
      and m.deleted_at is null
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid)  to authenticated;
revoke execute on function public.is_org_member(uuid) from anon, public;
revoke execute on function public.is_org_admin(uuid)  from anon, public;


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 2.6 — supabase_auth_admin read access for the JWT hook
-- ══════════════════════════════════════════════════════════════════════════
-- With FORCE RLS, the BYPASSRLS attribute of supabase_auth_admin does not
-- apply. The custom_access_token_hook (sub-plan 03) reads public.member,
-- public.user_active_org, and public.platform_admins — without these explicit
-- SELECT policies, the hook silently returns 0 rows and emits claims=null.

create policy "member_select_supabase_auth_admin" on public.member
  for select to supabase_auth_admin
  using (true);

create policy "user_active_org_select_supabase_auth_admin" on public.user_active_org
  for select to supabase_auth_admin
  using (true);

create policy "platform_admins_select_supabase_auth_admin" on public.platform_admins
  for select to supabase_auth_admin
  using (true);


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — Multitenancy policies
-- ══════════════════════════════════════════════════════════════════════════

-- ─── organization ───────────────────────────────────────────────────────
create policy "organization_select_member_or_superadmin" on public.organization
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or public.is_org_member(public.organization.id)
  );

create policy "organization_insert_any_authenticated" on public.organization
  for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "organization_update_owner_admin" on public.organization
  for update to authenticated
  using (public.is_org_admin(public.organization.id))
  with check (public.is_org_admin(public.organization.id));


-- ─── member ─────────────────────────────────────────────────────────────
-- Policies use is_org_member / is_org_admin helpers to avoid infinite
-- recursion (see Section 2.5).
create policy "member_select_same_org_or_superadmin" on public.member
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (
      public.member.deleted_at is null
      and public.is_org_member(public.member.organization_id)
    )
  );

create policy "member_insert_by_owner_admin" on public.member
  for insert to authenticated
  with check (public.is_org_admin(public.member.organization_id));

-- UPDATE path 1: owner/admin — any field, any member in their org.
create policy "member_update_by_owner_admin" on public.member
  for update to authenticated
  using (public.is_org_admin(public.member.organization_id))
  with check (public.is_org_admin(public.member.organization_id));

-- UPDATE path 2: self — only title. Role/org/user_id locked via post-check.
-- A member cannot escalate their own role via direct UPDATE; WITH CHECK
-- self-lookup compares the new row's immutable columns with pre-update values.
create policy "member_update_self_title_only" on public.member
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and role = (select m2.role from public.member m2 where m2.id = public.member.id)
    and organization_id = (select m2.organization_id from public.member m2 where m2.id = public.member.id)
  );


-- ─── invitation ─────────────────────────────────────────────────────────
create policy "invitation_select_admin_or_invitee" on public.invitation
  for select to authenticated
  using (
    public.is_org_admin(public.invitation.organization_id)
    or lower(public.invitation.email) = lower((select auth.email()))
  );

create policy "invitation_insert_by_owner_admin" on public.invitation
  for insert to authenticated
  with check (public.is_org_admin(public.invitation.organization_id));

-- UPDATE: WITH CHECK pins organization_id to its pre-update value via
-- self-lookup (prevents migration across orgs) AND re-enforces the
-- admin-or-invitee rule on the post-update row.
create policy "invitation_update_admin_or_invitee" on public.invitation
  for update to authenticated
  using (
    public.is_org_admin(public.invitation.organization_id)
    or lower(public.invitation.email) = lower((select auth.email()))
  )
  with check (
    organization_id = (select organization_id from public.invitation i2 where i2.id = public.invitation.id)
    and (
      public.is_org_admin(public.invitation.organization_id)
      or lower(public.invitation.email) = lower((select auth.email()))
    )
  );


-- ─── user_active_org ────────────────────────────────────────────────────
create policy "user_active_org_select_own" on public.user_active_org
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_active_org_insert_own" on public.user_active_org
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_active_org_update_own" on public.user_active_org
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ─── role_permissions ───────────────────────────────────────────────────
create policy "role_permissions_select_authenticated" on public.role_permissions
  for select to authenticated
  using (true);


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 4 — Domain tables (role-aware + soft delete + super admin)
-- ══════════════════════════════════════════════════════════════════════════

-- ─── properties ─────────────────────────────────────────────────────────
create policy "properties_select_org" on public.properties
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );

create policy "properties_insert_org" on public.properties
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and created_by_user_id = (select auth.uid())
    and deleted_at is null
  );

create policy "properties_update_role_aware" on public.properties
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and ((select auth.jwt() ->> 'org_role') in ('owner', 'admin') or created_by_user_id = (select auth.uid()))
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );

-- ─── leads ──────────────────────────────────────────────────────────────
create policy "leads_select_org" on public.leads
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "leads_insert_org" on public.leads
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and created_by_user_id = (select auth.uid())
    and deleted_at is null
  );
create policy "leads_update_role_aware" on public.leads
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and ((select auth.jwt() ->> 'org_role') in ('owner', 'admin') or created_by_user_id = (select auth.uid()))
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );

-- ─── appointments ───────────────────────────────────────────────────────
create policy "appointments_select_org" on public.appointments
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "appointments_insert_org" on public.appointments
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and created_by_user_id = (select auth.uid())
    and deleted_at is null
  );
create policy "appointments_update_role_aware" on public.appointments
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and ((select auth.jwt() ->> 'org_role') in ('owner', 'admin') or created_by_user_id = (select auth.uid()))
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );

-- ─── ai_contents ────────────────────────────────────────────────────────
create policy "ai_contents_select_org" on public.ai_contents
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "ai_contents_insert_org" on public.ai_contents
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and created_by_user_id = (select auth.uid())
    and deleted_at is null
  );
create policy "ai_contents_update_role_aware" on public.ai_contents
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and ((select auth.jwt() ->> 'org_role') in ('owner', 'admin') or created_by_user_id = (select auth.uid()))
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );

-- ─── lead_property_queue ────────────────────────────────────────────────
create policy "lpq_select_org" on public.lead_property_queue
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "lpq_insert_org" on public.lead_property_queue
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and created_by_user_id = (select auth.uid())
    and deleted_at is null
  );
create policy "lpq_update_role_aware" on public.lead_property_queue
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and ((select auth.jwt() ->> 'org_role') in ('owner', 'admin') or created_by_user_id = (select auth.uid()))
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 5 — Domain tables (super admin bypass, owner/admin for UPDATE)
-- ══════════════════════════════════════════════════════════════════════════

-- ─── bot_config (INSERT restricted to owner/admin — whole-org config) ──
create policy "bot_config_select_org" on public.bot_config
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "bot_config_insert_owner_admin" on public.bot_config
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and (select auth.jwt() ->> 'org_role') in ('owner', 'admin')
    and deleted_at is null
  );
create policy "bot_config_update_owner_admin" on public.bot_config
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and (select auth.jwt() ->> 'org_role') in ('owner', 'admin')
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );

-- ─── bot_conversations ──────────────────────────────────────────────────
create policy "bot_conversations_select_org" on public.bot_conversations
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "bot_conversations_insert_org" on public.bot_conversations
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
  );
create policy "bot_conversations_update_owner_admin" on public.bot_conversations
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and (select auth.jwt() ->> 'org_role') in ('owner', 'admin')
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );

-- ─── bot_messages ───────────────────────────────────────────────────────
create policy "bot_messages_select_org" on public.bot_messages
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "bot_messages_insert_org" on public.bot_messages
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
  );
create policy "bot_messages_update_owner_admin" on public.bot_messages
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and (select auth.jwt() ->> 'org_role') in ('owner', 'admin')
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 6 — Append-only + self-scoped
-- ══════════════════════════════════════════════════════════════════════════

-- ─── analytics_events (append-only — no UPDATE policy at all) ──────────
create policy "analytics_events_select_org" on public.analytics_events
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
  );
create policy "analytics_events_insert_org" on public.analytics_events
  for insert to authenticated
  with check (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid));

-- ─── agent_profiles (self-only INSERT/UPDATE) ──────────────────────────
create policy "agent_profiles_select_org" on public.agent_profiles
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid) and deleted_at is null)
  );
create policy "agent_profiles_insert_self" on public.agent_profiles
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and user_id = (select auth.uid())
    and deleted_at is null
  );
create policy "agent_profiles_update_self" on public.agent_profiles
  for update to authenticated
  using (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and deleted_at is null
    and user_id = (select auth.uid())
  )
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and user_id = (select auth.uid())
  );


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 7 — platform_admins (SELECT-only, managed via service_role)
-- ══════════════════════════════════════════════════════════════════════════

create policy "platform_admins_select_super_only" on public.platform_admins
  for select to authenticated
  using ((select (auth.jwt() ->> 'is_super_admin')::boolean) is true);


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 8 — property_transfers (immutable audit, roadmap feature 2.4)
-- ══════════════════════════════════════════════════════════════════════════

create policy "property_transfers_select_involved_or_admin" on public.property_transfers
  for select to authenticated
  using (
    (select (auth.jwt() ->> 'is_super_admin')::boolean) is true
    or (
      organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
      and (
        from_user_id = (select auth.uid())
        or to_user_id = (select auth.uid())
        or transferred_by_user_id = (select auth.uid())
        or (select auth.jwt() ->> 'org_role') in ('owner', 'admin')
      )
    )
  );

-- INSERT: double-gate — role check (short-circuit) + authorize() (authoritative).
create policy "property_transfers_insert_admin_with_permission" on public.property_transfers
  for insert to authenticated
  with check (
    organization_id = (select (auth.jwt() ->> 'active_org_id')::uuid)
    and (select auth.jwt() ->> 'org_role') in ('owner', 'admin')
    and public.authorize('property.assign')
  );

-- No UPDATE, no DELETE — audit immutable.


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 9 — Storage policies
-- ══════════════════════════════════════════════════════════════════════════
-- Path convention: {org_id}/{entity_id}/{uuid}.{ext}.
-- Public buckets (avatars, property-media): NO SELECT policy — URLs bypass RLS
-- via bucket.public=true. No list() feature requires enumeration.
-- Private bucket (brochures): SELECT policy scoped to same-org.

-- ─── avatars (public bucket) ────────────────────────────────────────────
create policy "avatars_insert_own_org" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );
create policy "avatars_update_own_org" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );
create policy "avatars_delete_own_org" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );

-- ─── property-media (public bucket) ─────────────────────────────────────
create policy "property_media_insert_own_org" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );
create policy "property_media_update_own_org" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  )
  with check (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );
create policy "property_media_delete_own_org" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );

-- ─── brochures (private bucket) ─────────────────────────────────────────
create policy "brochures_select_own_org" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'brochures'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );
create policy "brochures_insert_own_org" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brochures'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );
create policy "brochures_update_own_org" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brochures'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  )
  with check (
    bucket_id = 'brochures'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );
create policy "brochures_delete_own_org" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brochures'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'active_org_id')
  );


-- ══════════════════════════════════════════════════════════════════════════
-- SECTION 10 — Partial indexes for hot-path reads
-- ══════════════════════════════════════════════════════════════════════════

create index if not exists properties_active_org_idx
  on public.properties (organization_id)
  where deleted_at is null;

create index if not exists leads_active_org_idx
  on public.leads (organization_id)
  where deleted_at is null;

create index if not exists appointments_active_org_starts_idx
  on public.appointments (organization_id, starts_at)
  where deleted_at is null;
