export interface SessionContext {
  userId: string
  orgId: string
  role: "owner" | "admin" | "agent"
  isSuperAdmin?: boolean
  /**
   * Caller email as carried by the JWT (`claims.email`). Nullable because
   * Supabase Auth allows phone-only / anonymous users in principle — today
   * Black Estate is email-auth only, so in practice this is always set,
   * but keeping it nullable matches the DB schema (`auth.users.email`) and
   * leaves room for future auth providers.
   *
   * Injected into `request.jwt.claims` by `withRLS` so RLS policies that
   * reference `auth.email()` (e.g. `invitation_select_admin_or_invitee`)
   * can authorise invitee self-lookups without a SECURITY DEFINER detour.
   */
  email: string | null
  /**
   * Display name of the caller as resolved by `custom_access_token_hook`
   * (`claims.user_name`). Falls back through `full_name` → `name` →
   * email local-part → `'User'` per `handle_new_user()` logic. Used for
   * audit trails (e.g. `deleted_by_user_name` snapshot) so the trash UI
   * can render "deleted by" without joining `auth.users` on every read.
   */
  userName: string | null
  /**
   * Avatar URL from `user_metadata.avatar_url` (populated by Google OAuth or
   * a manual auth.updateUser call). Used as fallback when `agent_profiles.avatar_url`
   * is empty — i.e. the user hasn't uploaded a custom avatar yet.
   */
  avatarUrl?: string
}
