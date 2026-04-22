-- Sub-plan 01 post-review fix — CHECK constraint on invitation.
--
-- Rationale: invited_by_user_id is nullable at column level because the
-- auth.users FK uses ON DELETE SET NULL (preserves the invitation row when
-- the inviter's auth account is deleted). However, an invitation must not be
-- CREATED with NULL inviter — a null here for a pending invitation indicates
-- a bug in application code.
--
-- Drizzle does not express CHECK constraints natively, hence this manual SQL.

ALTER TABLE public.invitation
  ADD CONSTRAINT invitation_inviter_required_when_pending
  CHECK (status != 'pending' OR invited_by_user_id IS NOT NULL);
