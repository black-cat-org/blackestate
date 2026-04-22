-- Migration 008: accept_invitation fixes from IMP-7 code review
--
-- Two corrections to the function defined in migration 007:
--
-- 1. Soft-deleted member bug: the previous `on conflict (user_id,
--    organization_id) do nothing` silently discarded the insert when a
--    row already existed for that (user, org) — including soft-deleted
--    rows (the unique index is not partial). The invitation would then
--    be marked accepted and user_active_org flipped, but the old member
--    row still had deleted_at IS NOT NULL, so the SELECT policy hid
--    everything and the user ended up locked out of the org they just
--    joined. Fix: on conflict, restore the soft-deleted row in place,
--    refreshing role/email/name/avatar from the invitation.
--
-- 2. Non-idiomatic rowcount check: `if v_inv is null` on a PL/pgSQL
--    record variable is fragile (a record is NULL only when every field
--    is NULL). Replace with `if not found`, the canonical way to detect
--    a zero-row SELECT ... INTO.
--
-- The function is re-created with `create or replace` so existing grants
-- on `authenticated` and revokes from `anon/public` carry over unchanged.

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid := (select auth.uid());
  v_user_email text := lower(trim((select auth.jwt() ->> 'email')));
  v_user_name text;
  v_avatar_url text;
  v_inv record;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_user_email is null or v_user_email = '' then
    raise exception 'email_missing' using errcode = '28000';
  end if;

  select
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.raw_user_meta_data ->> 'avatar_url'
  into v_user_name, v_avatar_url
  from auth.users u
  where u.id = v_user_id
  limit 1;

  select id, organization_id, email, role, status, expires_at
  into v_inv
  from public.invitation
  where token = p_token
  for update
  limit 1;

  if not found then
    raise exception 'invitation_not_found' using errcode = '02000';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = '22023';
  end if;
  if v_inv.expires_at < now() then
    update public.invitation
    set status = 'expired', updated_at = now()
    where id = v_inv.id;
    raise exception 'invitation_expired' using errcode = '22023';
  end if;
  if lower(v_inv.email) <> v_user_email then
    raise exception 'invitation_email_mismatch' using errcode = '28000';
  end if;

  v_org_id := v_inv.organization_id;

  -- Idempotent fast path: active membership already exists.
  if exists (
    select 1 from public.member
    where user_id = v_user_id
      and organization_id = v_org_id
      and deleted_at is null
  ) then
    update public.invitation
    set status = 'accepted', accepted_at = now(), updated_at = now()
    where id = v_inv.id;
    return v_org_id;
  end if;

  -- Insert new membership OR restore a soft-deleted one. Refresh role +
  -- profile fields from the invitation so an admin who re-invites a
  -- previously removed user lands them back in the correct role.
  insert into public.member (user_id, organization_id, role, email, name, avatar_url)
  values (
    v_user_id,
    v_org_id,
    v_inv.role,
    v_user_email,
    nullif(trim(coalesce(v_user_name, '')), ''),
    nullif(trim(coalesce(v_avatar_url, '')), '')
  )
  on conflict (user_id, organization_id) do update
    set role       = excluded.role,
        email      = excluded.email,
        name       = excluded.name,
        avatar_url = excluded.avatar_url,
        deleted_at = null,
        updated_at = now();

  insert into public.user_active_org (user_id, organization_id)
  values (v_user_id, v_org_id)
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        updated_at = now();

  update public.invitation
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = v_inv.id;

  return v_org_id;
end
$func$;

comment on function public.accept_invitation(text) is
  'Atomic invitation acceptance: validates token, email match, and expiry, '
  'then creates member (or restores a soft-deleted one) and marks the '
  'invitation accepted. SECURITY DEFINER: bypasses RLS because the invitee '
  'is not yet a member. Only callable by authenticated users.';
