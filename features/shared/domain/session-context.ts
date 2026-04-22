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
}
