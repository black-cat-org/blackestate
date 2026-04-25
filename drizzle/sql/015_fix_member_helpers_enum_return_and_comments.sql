-- Follow-up to migration 014 (G26 fix), addressing review feedback.
--
-- MAJOR-1: helpers in 014 returned `text` and the policy compared via
-- `role::text = ...`. The original (pre-fix) policy compared enum to enum.
-- The text-cast asymmetry was benign today but a silent type widening that
-- future enum changes could surface. This migration recreates the helpers
-- with the `member_role` enum as the return type and rebuilds the policy
-- with `role = helper(...)` (no cast).
--
-- MINOR-1: `is_org_member` and `is_org_admin` (006 sec 2.5) lacked
-- `comment on function`. Documentation asymmetry with the G26 helpers
-- introduced in 014 — closed here.
--
-- DB history has both `fix_member_update_self_title_only_recursion` (014)
-- and `fix_member_helpers_enum_return_and_comments` (this file, 015) as
-- separate migrations because the review-driven upgrade landed after 014
-- was already applied. A fresh DB replay of 014→015 produces the same
-- final state.

-- 1. DROP POLICY first (depends on helpers)
drop policy if exists "member_update_self_title_only" on public.member;

-- 2. DROP old text-returning helpers (CREATE OR REPLACE cannot change return type)
drop function if exists public.get_member_current_role(uuid);
drop function if exists public.get_member_current_org_id(uuid);

-- 3. Recreate with enum return
create or replace function public.get_member_current_role(p_member_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.member where id = p_member_id
$$;

revoke execute on function public.get_member_current_role(uuid) from public, anon;
grant execute on function public.get_member_current_role(uuid) to authenticated;

comment on function public.get_member_current_role(uuid) is
  'SECURITY DEFINER helper — returns the pre-update member_role for use in member RLS WITH CHECK clauses. Bypasses RLS to avoid 42P17 recursion (G26 fix). Returns the enum directly so the policy can compare enum-to-enum without a text cast.';

create or replace function public.get_member_current_org_id(p_member_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.member where id = p_member_id
$$;

revoke execute on function public.get_member_current_org_id(uuid) from public, anon;
grant execute on function public.get_member_current_org_id(uuid) to authenticated;

comment on function public.get_member_current_org_id(uuid) is
  'SECURITY DEFINER helper — returns the pre-update organization_id for use in member RLS WITH CHECK clauses. Bypasses RLS to avoid 42P17 recursion (G26 fix).';

-- 4. Recreate policy with enum-to-enum equality (no ::text cast)
create policy "member_update_self_title_only" on public.member
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and role = public.get_member_current_role(public.member.id)
    and organization_id = public.get_member_current_org_id(public.member.id)
  );

-- 5. MINOR-1: backfill comments on the existing helpers
comment on function public.is_org_member(uuid) is
  'SECURITY DEFINER helper — returns true if auth.uid() is an active (non-deleted) member of p_org_id. Used in RLS policies on member/organization to bypass RLS without triggering 42P17 recursion.';

comment on function public.is_org_admin(uuid) is
  'SECURITY DEFINER helper — returns true if auth.uid() is an active owner or admin of p_org_id. Used in RLS policies on member/organization/invitation to bypass RLS without triggering 42P17 recursion.';
