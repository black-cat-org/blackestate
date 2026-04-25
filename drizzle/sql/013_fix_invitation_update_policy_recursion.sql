-- Fix infinite recursion in invitation_update_admin_or_invitee.
--
-- The original WITH CHECK (defined in 006) included a self-lookup:
--   organization_id = (select organization_id from invitation i2 where i2.id = invitation.id)
-- to pin organization_id to its pre-update value. That subquery against
-- the same table re-evaluated the policy on i2, which re-evaluated it
-- again, ad infinitum. Postgres surfaced "42P17 infinite recursion
-- detected in policy for relation invitation" and aborted every UPDATE,
-- silently breaking reject (T107-T110) and cancel (T111-T114) since
-- production day 1.
--
-- The protection the subquery provided is preserved by re-evaluating
-- `is_org_admin(organization_id)` on the post-update NEW row: if an
-- admin tried to migrate an invitation to a foreign org, the check
-- would fail because the caller is not admin of that org.
--
-- USING (pre-update) and WITH CHECK (post-update) are now identical:
-- the admin branch authorises org-side reject/cancel, the invitee
-- branch (lower(email) = lower(auth.email())) authorises self-reject.
-- No table self-reference, no recursion.

drop policy if exists "invitation_update_admin_or_invitee" on public.invitation;

create policy "invitation_update_admin_or_invitee" on public.invitation
  for update to authenticated
  using (
    public.is_org_admin(public.invitation.organization_id)
    or lower(public.invitation.email) = lower((select auth.email()))
  )
  with check (
    public.is_org_admin(public.invitation.organization_id)
    or lower(public.invitation.email) = lower((select auth.email()))
  );
