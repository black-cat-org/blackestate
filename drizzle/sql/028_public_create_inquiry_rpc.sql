-- Migration 028: public_create_inquiry SECURITY DEFINER RPC
--
-- Replaces the legacy public-form path that called the authenticated
-- `createLeadAction` from an unauthenticated visitor — which fails the
-- moment Supabase Auth's `getSessionContext()` runs without a JWT.
--
-- The function is the public landing's bridge across the RLS boundary:
-- an anon visitor (no JWT, no `active_org_id`) cannot INSERT into
-- `contact` or `inquiry` directly because the only anon policies on
-- those tables are SELECT-via-organization-membership (none). Same
-- pattern as `bootstrap_organization` and `accept_invitation` (007):
-- the function owns the bypass; the app does not.
--
-- Multitenancy zero-trust (CLAUDE.md):
--   - Caller never picks the `organization_id`. It is derived from the
--     property's `organization_id` (which is itself protected by the
--     `properties_select_public` anon SELECT policy in 017b — anon can
--     only see active, non-deleted properties).
--   - `created_by_user_id` of the resulting Contact + Inquiry is the
--     property owner's user_id — the agent who published the property
--     legitimately captures the lead.
--   - The function NEVER reads `auth.uid()` to derive the actor: anon
--     callers do not have one.
--
-- Idempotency / EC8 reactivation:
--   If an open Inquiry already exists for the resolved Contact+Property
--   pair, the function returns its id instead of inserting a duplicate.
--   The partial UNIQUE index `inquiry_unique_open_contact_property`
--   (026) is the source of truth at the DB. Concurrency story:
--     - On a HOT path (row exists), the pre-INSERT SELECT short-circuits.
--     - On a COLD path (no row yet, two concurrent callers race past
--       the SELECT), the UNIQUE index raises 23505 on the loser. The
--       EXCEPTION block catches it, re-fetches the winner's row, and
--       returns that id — preserving the idempotency contract.
--     A naive `FOR UPDATE` on the pre-INSERT SELECT does NOT close the
--     cold-path race because there is no row to lock yet. The PG
--     unique-violation exception is the only race guarantee.
--
-- Dedup canonicalisation:
--   Phone and email matching must agree byte-for-byte with the JS
--   mapper (`features/contacts/infrastructure/contact.mapper.ts`).
--   The two normalisations mirrored here:
--     - phone: strip every char that is not a digit or a leading `+`
--     - email: trim then lowercase (JS does the same; lower is
--       locale-independent on ASCII so order does not affect the
--       result, but the explicit ordering keeps the comment ↔ code
--       contract verifiable on inspection)
--   The `contact_org_phone_idx` and `contact_org_email_idx` (026) are
--   partial / functional indexes that ONLY hit when the lookup uses
--   the canonical form — hence the explicit normalisation here, NOT
--   `WHERE phone = p_phone` which would miss matches with whitespace.
--
-- Error tokens follow the new lowercase_snake_case convention
-- (Inquiry / Deal R23+ standard, R46c sweep pending for Contact). The
-- action layer (`features/inquiries/presentation/public-actions.ts`)
-- maps each token to a user-facing Spanish message.

create or replace function public.public_create_inquiry(
  p_property_id text,
  p_name        text,
  p_phone       text,
  p_email       text,
  p_message     text default null
) returns text
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_name       text := nullif(trim(p_name), '');
  v_phone_raw  text := nullif(trim(coalesce(p_phone, '')), '');
  v_email_raw  text := nullif(trim(coalesce(p_email, '')), '');
  v_phone      text;  -- canonical: digits + leading +
  v_email      text;  -- canonical: trim then lower (matches JS mapper)
  v_message    text := nullif(trim(coalesce(p_message, '')), '');

  v_org_id         uuid;
  v_owner_user_id  uuid;

  v_contact_id text;
  v_inquiry_id text;
begin
  -- ── 1. Validate inputs ────────────────────────────────────────────────
  if v_name is null then
    raise exception 'name_required' using errcode = '22023';
  end if;

  -- Canonicalise phone: strip everything that is not a digit or `+`.
  -- An all-junk phone collapses to empty → treated as "no phone".
  if v_phone_raw is not null then
    v_phone := regexp_replace(v_phone_raw, '[^0-9+]', '', 'g');
    if v_phone = '' then
      v_phone := null;
    end if;
  end if;

  -- Canonicalise email: trim is already applied at the raw assignment
  -- (line 76), so the canonical form is just `lower()` on the trimmed
  -- input — equivalent to JS `raw.trim().toLowerCase()`.
  if v_email_raw is not null then
    v_email := lower(v_email_raw);
  end if;

  if v_phone is null and v_email is null then
    raise exception 'contact_missing_phone_and_email' using errcode = '22023';
  end if;

  -- ── 2. Resolve property → org + owner ─────────────────────────────────
  -- The same `status='active' AND deleted_at IS NULL` filter the public
  -- landing route already applies via the `properties_select_public`
  -- anon policy. Duplicated here because SECURITY DEFINER runs as the
  -- function owner (RLS bypass), so we re-assert the same predicate
  -- defensively — an inactive or trashed property must not be a valid
  -- inquiry target.
  select organization_id, created_by_user_id
    into v_org_id, v_owner_user_id
    from public.properties
   where id = p_property_id
     and status = 'active'
     and deleted_at is null
   limit 1;

  if v_org_id is null then
    raise exception 'property_not_found_or_inactive' using errcode = '02000';
  end if;

  -- ── 3. Find-or-create Contact (dedup hot path) ────────────────────────
  -- Hit the partial indexes from 026:
  --   contact_org_phone_idx ON (organization_id, phone)
  --     WHERE phone IS NOT NULL AND deleted_at IS NULL
  --   contact_org_email_idx ON (organization_id, lower(email))
  --     WHERE email IS NOT NULL AND deleted_at IS NULL
  -- Order: phone before email — phones are stronger identity in
  -- LATAM real estate (people share family emails more than phones).
  --
  -- Determinism: `ORDER BY created_at, id` chooses the earliest
  -- existing match in the rare case where dedup discipline leaked
  -- a duplicate contact in. Without explicit ordering Postgres picks
  -- arbitrary heap order, which is fine for correctness but obscures
  -- the choice in audit logs.
  if v_phone is not null then
    select id into v_contact_id
      from public.contact
     where organization_id = v_org_id
       and phone = v_phone
       and deleted_at is null
     order by created_at, id
     limit 1;
  end if;

  if v_contact_id is null and v_email is not null then
    select id into v_contact_id
      from public.contact
     where organization_id = v_org_id
       and lower(email) = v_email
       and deleted_at is null
     order by created_at, id
     limit 1;
  end if;

  if v_contact_id is null then
    insert into public.contact (organization_id, created_by_user_id, name, phone, email)
      values (v_org_id, v_owner_user_id, v_name, v_phone, v_email)
    returning id into v_contact_id;
  end if;

  -- ── 4. EC8 reactivation: short-circuit if an open inquiry exists ──────
  -- Best-effort fast path. The cold-path race window is closed by the
  -- EXCEPTION block on the INSERT below (the partial UNIQUE is the
  -- ultimate guard) — no `FOR UPDATE` here because there is no row to
  -- lock when this is the first submission for the (org, contact,
  -- property) triple.
  select id into v_inquiry_id
    from public.inquiry
   where organization_id = v_org_id
     and contact_id      = v_contact_id
     and property_id     = p_property_id
     and status          = 'open'
     and deleted_at      is null
   order by created_at, id
   limit 1;

  if v_inquiry_id is not null then
    return v_inquiry_id;
  end if;

  -- ── 5. Insert fresh open inquiry — race-protected via UNIQUE catch ────
  begin
    insert into public.inquiry (
      organization_id,
      created_by_user_id,
      contact_id,
      property_id,
      source,
      status,
      message
    ) values (
      v_org_id,
      v_owner_user_id,
      v_contact_id,
      p_property_id,
      'public_form',
      'open',
      v_message
    )
    returning id into v_inquiry_id;

    return v_inquiry_id;

  exception when unique_violation then
    -- Concurrent caller won the race against `inquiry_unique_open_contact_property`.
    -- Re-fetch the winner's row so the loser sees the same idempotent
    -- result as the winner (returns existing open inquiry id).
    select id into v_inquiry_id
      from public.inquiry
     where organization_id = v_org_id
       and contact_id      = v_contact_id
       and property_id     = p_property_id
       and status          = 'open'
       and deleted_at      is null
     order by created_at, id
     limit 1;

    if v_inquiry_id is null then
      -- Constraint fired but no winner row visible — re-raise so the
      -- failure is loud instead of returning a misleading null.
      raise;
    end if;

    return v_inquiry_id;
  end;
end
$func$;

-- ── Grants ─────────────────────────────────────────────────────────────
-- Strip the implicit public grant, then explicitly enumerate the
-- callers. anon is the primary surface (visitor on /p/[id]).
-- authenticated is granted too because a logged-in agent may submit
-- the form from a device without an active session — the function
-- never trusts the caller (organization_id is derived from the
-- property lookup, never from the caller's JWT), so widening the
-- caller set does not widen the authorisation surface.
revoke execute on function public.public_create_inquiry(text, text, text, text, text) from public;
grant  execute on function public.public_create_inquiry(text, text, text, text, text) to anon, authenticated;

comment on function public.public_create_inquiry(text, text, text, text, text) is
  'Atomic public-form Inquiry capture. SECURITY DEFINER bypasses RLS so an '
  'unauthenticated visitor can create Contact + Inquiry on the property owner''s '
  'org. organization_id is always derived from the property lookup, never from '
  'the caller. Idempotent via EC8 reactivation on (org, contact, property, open); '
  'cold-path race closed by EXCEPTION-block re-fetch. Callable by anon or '
  'authenticated; the function never trusts the caller''s identity.';
