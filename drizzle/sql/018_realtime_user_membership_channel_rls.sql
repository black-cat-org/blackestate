-- 018_realtime_user_membership_channel_rls.sql
-- Applied: 2026-05-11 via Supabase MCP `apply_migration` as
--   "realtime_user_membership_channel_rls"
--
-- Defines the RLS policy that lets an authenticated user subscribe to
-- their OWN private Realtime channel and only that one. The server
-- broadcasts membership-change events (role updates, removals) to this
-- channel using the service role, which bypasses RLS — only the
-- subscribe path is gated here.
--
-- Channel naming follows the documented Supabase convention
-- `scope:id:entity`: `user:{auth.uid()}:membership`.
--
-- The policy targets `extension = 'broadcast'` so this authorisation
-- never accidentally widens to Presence or Postgres-Changes traffic on
-- the same topic in the future.
--
-- Sub-plan: docs/plans/2026-05-11-realtime-membership-revocation.md
-- (Layer 3 — UX instant push for membership revocation / role change)

CREATE POLICY realtime_user_membership_channel_subscribe
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'broadcast'
    AND realtime.topic() = 'user:' || (SELECT auth.uid())::text || ':membership'
  );
