-- Migration 010: let invitees read the org that invited them
--
-- IMP-8 adds an in-app "pending invitations" panel that lists orgs which
-- sent the caller an invitation. The invitee is NOT yet a member of the
-- target org, so `organization_select_member_or_superadmin` (which routes
-- through is_org_member()) hides the row. Without a policy carve-out, the
-- panel would have to fall back to a SECURITY DEFINER RPC just to resolve
-- org name/slug/logo — fighting the "every user query through withRLS"
-- discipline.
--
-- This policy authorises SELECT on an organization when the caller has a
-- pending, non-expired invitation for that org, matched case-insensitively
-- against `auth.email()`. Exposure is strictly limited to the invitation
-- window: rejected / accepted / cancelled / expired invitations do not
-- grant visibility.

create policy "organization_select_via_pending_invitation"
on public.organization
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.invitation i
    where i.organization_id = organization.id
      and lower(i.email) = lower((select auth.email()))
      and i.status = 'pending'
      and i.expires_at > now()
  )
);

comment on policy "organization_select_via_pending_invitation" on public.organization is
  'Grants SELECT on an organization to an authenticated caller while they '
  'have a pending, non-expired invitation for it (email match via auth.email()). '
  'Scoped to the invitation lifecycle so org metadata exposure is bounded '
  'to the period the invitee actually needs to decide. No write access.';
