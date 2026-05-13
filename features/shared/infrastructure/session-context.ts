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

  const rawMeta = claims.user_metadata as Record<string, unknown> | undefined

  return {
    userId: claims.sub,
    orgId,
    role,
    isSuperAdmin: claims.is_super_admin === true,
    email: typeof claims.email === "string" ? claims.email : null,
    userName: typeof claims.user_name === "string" ? claims.user_name : null,
    avatarUrl:
      typeof rawMeta?.avatar_url === "string" && rawMeta.avatar_url
        ? rawMeta.avatar_url
        : undefined,
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

/**
 * Sentinel orgId used by invitee-only flows when the caller has no
 * `active_org_id` claim (typically: a brand-new user who has been
 * invited to an org but has not joined any org yet, OR a user who was
 * removed from their last org and still has a pending invitation in
 * their inbox). The underlying RLS policies that this sentinel reaches
 * (`invitation_select_admin_or_invitee` invitee branch and
 * `organization_select_via_pending_invitation`) filter by
 * `auth.email()`, not by org id, so substituting this nil UUID does
 * not change their behaviour. Any other domain RLS policy that
 * compares `organization_id = (auth.jwt()->>'active_org_id')::uuid`
 * harmlessly returns false against this all-zero UUID — no real org
 * will ever match.
 */
const INVITEE_ORG_PLACEHOLDER = "00000000-0000-0000-0000-000000000000"

export interface InviteeAuthIdentity {
  ctx: SessionContext
  hasActiveOrg: boolean
}

/**
 * Resolve a `SessionContext` usable for invitee-side flows even when
 * the caller has no `active_org_id` JWT claim. Used by `/accept-invite`
 * and the invitee-facing actions (`getInvitationByTokenAction`,
 * `rejectInvitationAction`) where requiring a bootstrapped org would
 * make a brand-new invitee unable to view or respond to their
 * invitation.
 *
 * The returned `ctx` substitutes `INVITEE_ORG_PLACEHOLDER` for
 * `orgId` when the JWT lacks an active org, and defaults the role to
 * `agent` (the safest non-privileged role — any real authorisation
 * decision lives in the RLS policies, which key on email + token, not
 * on the placeholder values). The `hasActiveOrg` flag lets callers
 * branch on whether the user is fully bootstrapped (e.g. to decide
 * post-action navigation).
 */
export async function getInviteeAuthIdentity(): Promise<InviteeAuthIdentity> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error) {
    throw new Error(`[auth] Failed to read JWT claims: ${error.message}`)
  }
  const claims = data?.claims as Record<string, unknown> | undefined
  if (!claims || typeof claims.sub !== "string") {
    throw new Error("[auth] Not authenticated")
  }
  const activeOrgId =
    typeof claims.active_org_id === "string" ? claims.active_org_id : null
  const orgRole = isOrgRole(claims.org_role) ? claims.org_role : null
  const rawMeta = claims.user_metadata as Record<string, unknown> | undefined
  const ctx: SessionContext = {
    userId: claims.sub,
    orgId: activeOrgId ?? INVITEE_ORG_PLACEHOLDER,
    role: orgRole ?? "agent",
    isSuperAdmin: claims.is_super_admin === true,
    email: typeof claims.email === "string" ? claims.email : null,
    userName: typeof claims.user_name === "string" ? claims.user_name : null,
    avatarUrl:
      typeof rawMeta?.avatar_url === "string" && rawMeta.avatar_url
        ? rawMeta.avatar_url
        : undefined,
  }
  return { ctx, hasActiveOrg: activeOrgId !== null }
}
