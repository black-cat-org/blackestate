-- Migration 009: check_user_exists_by_email RPC
--
-- IMP-8 requires the send-invitation flow to reject invites to email
-- addresses that do not already belong to a registered Black Estate user.
-- (Invitations are strictly for existing users; onboarding a brand-new
-- person happens through sign-up / future referral flow, not invitations.)
--
-- Reading `auth.users` directly from the app is not an option:
--   * `anon`/`authenticated` cannot SELECT from `auth.users` by grant.
--   * Using `supabase.auth.admin.listUsers()` violates the CLAUDE.md rule
--     against Admin API calls for domain decisions.
-- A SECURITY DEFINER RPC is the right vehicle: the function owns the
-- auth.users lookup, returns only a boolean, and is grant-restricted to
-- authenticated callers.
--
-- Security notes:
--   * The RPC returns BOOLEAN, not the target user's id or row — so it
--     cannot be used to harvest user metadata. It only answers
--     "does someone with this email exist?", which is information a
--     motivated attacker can already infer from the public sign-up flow
--     ("email already registered" errors). Rate-limiting at the action
--     layer is tracked as future work.
--   * Case-insensitive match via lower(), mirroring the sign-up path.
--   * No access to any other field of auth.users.

create or replace function public.check_user_exists_by_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $func$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
  );
$func$;

revoke execute on function public.check_user_exists_by_email(text) from public;
revoke execute on function public.check_user_exists_by_email(text) from anon;
grant  execute on function public.check_user_exists_by_email(text) to authenticated;

comment on function public.check_user_exists_by_email(text) is
  'Returns true if an auth.users row exists with the given email '
  '(case-insensitive). SECURITY DEFINER: auth.users is not readable by '
  'authenticated role directly. Answer is a plain boolean — no metadata '
  'leaks. Callable only by authenticated users.';
