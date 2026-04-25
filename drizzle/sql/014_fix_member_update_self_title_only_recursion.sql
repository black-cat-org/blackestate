-- G26 fix: same self-referential subquery anti-pattern as G25
-- (invitation_update_admin_or_invitee) but on the member table. The
-- WITH CHECK clause in 006:194-198 contained two `select FROM public.member m2`
-- subqueries to pin role and organization_id to their pre-update values.
-- Under `FORCE RLS` those subqueries re-evaluate every member policy on
-- `m2`, which carries the same 42P17 infinite-recursion risk as G25.
-- Self-profile edits are low-traffic so it never surfaced in production,
-- but the structural vulnerability is identical and worth closing.
--
-- The fix replaces the self-referential subqueries with two SECURITY
-- DEFINER helper functions that bypass RLS to read the pre-update values
-- directly. Mirrors the `is_org_admin` pattern (006 sec 2.5) — same idiom,
-- same `set search_path = ''` hardening, same `authenticated`-only grants.

create or replace function public.get_member_current_role(p_member_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role::text from public.member where id = p_member_id
$$;

revoke execute on function public.get_member_current_role(uuid) from public, anon;
grant execute on function public.get_member_current_role(uuid) to authenticated;

comment on function public.get_member_current_role(uuid) is
  'SECURITY DEFINER helper — returns the pre-update role for use in member RLS WITH CHECK clauses. Bypasses RLS to avoid 42P17 recursion (G26 fix).';

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

drop policy if exists "member_update_self_title_only" on public.member;

create policy "member_update_self_title_only" on public.member
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and role::text = public.get_member_current_role(public.member.id)
    and organization_id = public.get_member_current_org_id(public.member.id)
  );
