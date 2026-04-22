import "server-only"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { SessionContext } from "@/features/shared/domain/session-context"

type OrgRole = SessionContext["role"]

const ORG_ROLES: readonly OrgRole[] = ["owner", "admin", "agent"]

function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value)
}

export interface AuthState {
  ctx: SessionContext
  claims: Record<string, unknown>
}

function toSessionContext(claims: Record<string, unknown>): SessionContext {
  if (typeof claims.sub !== "string") {
    throw new Error("[auth] Not authenticated")
  }

  const orgId = claims.active_org_id
  const role = claims.org_role

  if (typeof orgId !== "string" || !isOrgRole(role)) {
    throw new Error(
      "[auth] JWT is missing active_org_id / org_role. " +
        "Verify the custom_access_token hook is enabled and that " +
        "handle_new_user() created an org for this user.",
    )
  }

  return {
    userId: claims.sub,
    orgId,
    role,
    isSuperAdmin: claims.is_super_admin === true,
    email: typeof claims.email === "string" ? claims.email : null,
  }
}

/**
 * Fetch the full Supabase Auth state in a single JWT read.
 *
 * Returns both the session context (for RLS) and the raw claims (for UI
 * display info like email, full_name, avatar_url). Callers that need both
 * should prefer this over calling `getSessionContext` twice.
 */
export async function getAuthState(): Promise<AuthState> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error) {
    throw new Error(`[auth] Failed to read JWT claims: ${error.message}`)
  }

  const claims = data?.claims as Record<string, unknown> | undefined
  if (!claims) {
    throw new Error("[auth] Not authenticated")
  }

  return { ctx: toSessionContext(claims), claims }
}

/**
 * Extract RLS session context from the current Supabase Auth session.
 *
 * Reads custom claims injected by the `custom_access_token` Postgres hook
 * (see `drizzle/sql/003_custom_access_token_hook.sql`):
 *   - `sub` — user UUID
 *   - `active_org_id` — user's active organization (from `user_active_org`)
 *   - `org_role` — role in the active org (owner/admin/agent)
 *   - `is_super_admin` — optional platform admin flag
 *
 * Throws if the session is missing or claims are malformed. A missing
 * `active_org_id` typically means the `handle_new_user()` trigger failed
 * to auto-create an org for a new user — the trigger is the source of
 * truth; we don't fall back to on-read creation here to avoid masking
 * infrastructure failures.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const { ctx } = await getAuthState()
  return ctx
}
