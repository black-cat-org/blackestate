-- Migration 007: RLS helpers and bootstrap RPCs
--
-- Two SECURITY DEFINER functions that eliminate the remaining db-direct RLS
-- bypasses in drizzle-organization.repository.ts and
-- drizzle-invitation.repository.ts. Both cases need to write across the
-- RLS boundary for legitimate reasons (first-org creation happens before
-- the JWT carries active_org_id; invitation acceptance happens before the
-- invitee is a member of the target org), and a SECURITY DEFINER RPC is the
-- safe vehicle for that — the function owns the bypass, not the app.
--
-- Guard rails baked in:
--   - SET search_path = '' forces fully qualified names inside the body
--   - EXECUTE revoked from anon/public; only `authenticated` can call
--   - Every mutation happens against the CALLER's auth.uid() (never a
--     caller-supplied user id), so an attacker cannot forge membership for
--     someone else's account
--   - accept_invitation re-validates token status, expiry, and email match
--     against auth.jwt() ->> 'email' before creating the member row
--   - Both functions raise sqlstate-specific errors so callers can surface
--     domain-meaningful messages without parsing strings

create or replace function public.bootstrap_organization(
  p_name text,
  p_slug text,
  p_email text,
  p_name_user text default null,
  p_avatar_url text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_slug text := lower(trim(p_slug));
  v_name text := trim(p_name);
  v_email text := lower(trim(p_email));
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_name = '' then
    raise exception 'name_required' using errcode = '22023';
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$' then
    raise exception 'invalid_slug' using errcode = '22023';
  end if;
  if v_email = '' then
    raise exception 'email_required' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.organization
    where slug = v_slug and deleted_at is null
  ) then
    raise exception 'slug_taken' using errcode = '23505';
  end if;

  insert into public.organization (name, slug, plan, max_seats)
  values (v_name, v_slug, 'free', 1)
  returning id into v_org_id;

  insert into public.member (user_id, organization_id, role, email, name, avatar_url)
  values (
    v_user_id,
    v_org_id,
    'owner',
    v_email,
    nullif(trim(coalesce(p_name_user, '')), ''),
    nullif(trim(coalesce(p_avatar_url, '')), '')
  );

  insert into public.user_active_org (user_id, organization_id)
  values (v_user_id, v_org_id)
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        updated_at = now();

  return v_org_id;
end
$func$;

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

  if v_inv is null then
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

  -- Idempotent: if the caller is already a member, only close the invitation.
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

  insert into public.member (user_id, organization_id, role, email, name, avatar_url)
  values (
    v_user_id,
    v_org_id,
    v_inv.role,
    v_user_email,
    nullif(trim(coalesce(v_user_name, '')), ''),
    nullif(trim(coalesce(v_avatar_url, '')), '')
  )
  on conflict (user_id, organization_id) do nothing;

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

revoke execute on function public.bootstrap_organization(text, text, text, text, text) from public;
revoke execute on function public.bootstrap_organization(text, text, text, text, text) from anon;
grant  execute on function public.bootstrap_organization(text, text, text, text, text) to authenticated;

revoke execute on function public.accept_invitation(text) from public;
revoke execute on function public.accept_invitation(text) from anon;
grant  execute on function public.accept_invitation(text) to authenticated;

comment on function public.bootstrap_organization(text, text, text, text, text) is
  'Atomic creation of organization + owner member + active_org assignment. '
  'SECURITY DEFINER: bypasses RLS to allow first-org creation before the '
  'JWT has active_org_id. Only callable by authenticated users (anon/public revoked).';

comment on function public.accept_invitation(text) is
  'Atomic invitation acceptance: validates token, email match, and expiry, then '
  'creates member, sets active_org, and marks the invitation accepted. '
  'SECURITY DEFINER: bypasses RLS because the invitee is not yet a member of '
  'the target org. Only callable by authenticated users.';
