import { eq, and, sql, gt, lt, inArray, or, desc } from "drizzle-orm"
import { invitation, member, organization } from "@/lib/db/schema"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { withRLS } from "./rls"
import { mapInvitationRowToEntity } from "./invitation.mapper"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  ArchivedInvitation,
  Invitation,
  PendingInvitation,
  IncomingInvitation,
  InvitableRole,
} from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository, InvitationSummary } from "@/features/shared/domain/invitation.repository"

const INVITABLE_ROLES: readonly string[] = ["admin", "agent"]

/**
 * Translate a Postgres error raised by `accept_invitation` into a domain
 * error. The RPC uses distinct `raise exception` tokens so the caller can
 * surface meaningful messages without parsing the raw text.
 */
function translateAcceptError(message: string | undefined): Error {
  switch (message) {
    case "invitation_not_found":
      return new Error("No encontramos esta invitación.")
    case "invitation_not_pending":
      return new Error("Esta invitación ya fue procesada.")
    case "invitation_expired":
      return new Error("Esta invitación expiró. Pide al administrador que te envíe una nueva.")
    case "invitation_email_mismatch":
      return new Error("Esta invitación es para otra dirección de email.")
    case "email_missing":
    case "not_authenticated":
      return new Error("Necesitas iniciar sesión para aceptar la invitación.")
    default:
      return new Error("No pudimos procesar la invitación. Intenta de nuevo.")
  }
}

export class DrizzleInvitationRepository implements IInvitationRepository {
  /**
   * Check existence of an auth.users row for the given email via the
   * `check_user_exists_by_email` SECURITY DEFINER RPC. The RPC returns a
   * plain boolean and leaks no metadata; we keep the repository method
   * narrow so callers cannot accidentally expand it into a listing.
   */
  async userExists(email: string): Promise<boolean> {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.rpc("check_user_exists_by_email", {
      p_email: email,
    })
    if (error) throw new Error(`Failed to verify user existence: ${error.message}`)
    return data === true
  }

  async create(
    ctx: SessionContext,
    data: {
      organizationId: string
      email: string
      role: InvitableRole
      token: string
      invitedByUserId: string
      expiresAt: Date
    },
  ): Promise<Invitation> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .insert(invitation)
        .values({
          organizationId: data.organizationId,
          email: data.email.toLowerCase(),
          role: data.role,
          status: "pending",
          token: data.token,
          invitedByUserId: data.invitedByUserId,
          expiresAt: data.expiresAt,
        })
        .returning(),
    )
    const [row] = rows
    return mapInvitationRowToEntity(row)
  }

  /**
   * List pending invitations for the caller's active org. Enforced by the
   * `invitation_select_admin_or_invitee` policy — the admin branch
   * (`is_org_admin(organization_id)`) authorises owner/admin reads; the
   * invitee branch is irrelevant here because the caller is always admin
   * (the use case guards on `ctx.role`).
   */
  async findPendingByOrgId(ctx: SessionContext): Promise<PendingInvitation[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, ctx.orgId),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .orderBy(invitation.createdAt),
    )

    return rows
      .filter((r) => INVITABLE_ROLES.includes(r.role))
      .map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role as InvitableRole,
        expiresAt: r.expiresAt.toISOString(),
      }))
  }

  /**
   * List archived invitations for the caller's active org: rows the
   * invitee rejected (`status='rejected'`) plus rows that timed out
   * (`status='pending' AND expiresAt < now()`). Persisted `cancelled`
   * and `accepted` rows are intentionally excluded.
   *
   * The `expired` status is derived in code, not stored: there is no
   * background job that updates `pending` → `expired` in the DB, so the
   * mapper computes it from the row's stored status and `expiresAt`.
   * Sorted newest-first so the admin sees the most recent activity at
   * the top of the panel.
   *
   * RLS: authorised by `invitation_select_admin_or_invitee` (admin
   * branch). The use case guards on `ctx.role` so agents never reach
   * this query.
   */
  async findArchivedByOrgId(ctx: SessionContext): Promise<ArchivedInvitation[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, ctx.orgId),
            or(
              eq(invitation.status, "rejected"),
              // Persisted `expired` rows (future migration with a cron
              // job that flips `pending` → `expired` server-side). Today
              // the enum value exists but nothing in the codebase writes
              // it; including it here future-proofs the query so any
              // such migration is picked up automatically without a
              // matching code change. The doc comment on the repository
              // interface explicitly advertises this coverage.
              eq(invitation.status, "expired"),
              // Derived expiry: `pending` rows past `expiresAt`. The
              // mapper translates this to `status='expired'` for the UI.
              and(
                eq(invitation.status, "pending"),
                lt(invitation.expiresAt, new Date()),
              ),
            ),
          ),
        )
        .orderBy(desc(invitation.createdAt)),
    )

    return rows
      .filter((r) => INVITABLE_ROLES.includes(r.role))
      .map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role as InvitableRole,
        // Map persisted `rejected` and `expired` 1:1; derive `expired`
        // for `pending` rows that passed the `expiresAt < now()`
        // predicate above. The UI-facing union narrows to the two
        // archival states the panel knows how to render.
        status:
          r.status === "rejected" || r.status === "expired"
            ? r.status
            : "expired",
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }))
  }

  async hasPendingForEmail(ctx: SessionContext, email: string): Promise<boolean> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({ id: invitation.id })
        .from(invitation)
        .where(
          and(
            eq(invitation.organizationId, ctx.orgId),
            eq(invitation.email, email.toLowerCase()),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .limit(1),
    )
    return rows.length > 0
  }

  /**
   * List pending invitations for the caller (invitee side). Joined with the
   * inviting organisation so the UI can render "You were invited to <Org>"
   * in a single round trip. RLS chain:
   *   - `invitation_select_admin_or_invitee` — invitee branch matches
   *     `lower(email) = lower(auth.email())`.
   *   - `organization_select_via_pending_invitation` (migration 010) —
   *     exposes the inviting org while a pending, non-expired invitation
   *     exists for the caller's email.
   * The callee's `ctx.email` is injected into `auth.email()` by withRLS.
   */
  async findMyPending(ctx: SessionContext): Promise<IncomingInvitation[]> {
    if (!ctx.email) return []

    // Explicit email predicate so the planner can use `invitation_email_idx`
    // (stored lowercased at insert) and the query does not rely solely on
    // RLS to filter across every org. Mirrors the pattern in the
    // admin-side queries that scope to `ctx.orgId`.
    const normalizedEmail = ctx.email.toLowerCase()
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: invitation.id,
          token: invitation.token,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          organizationId: organization.id,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          organizationLogoUrl: organization.logoUrl,
        })
        .from(invitation)
        .innerJoin(organization, eq(organization.id, invitation.organizationId))
        .where(
          and(
            eq(invitation.email, normalizedEmail),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .orderBy(invitation.createdAt),
    )

    return rows
      .filter((r) => INVITABLE_ROLES.includes(r.role))
      .map((r) => ({
        id: r.id,
        token: r.token,
        role: r.role as InvitableRole,
        expiresAt: r.expiresAt.toISOString(),
        organizationId: r.organizationId,
        organizationName: r.organizationName,
        organizationSlug: r.organizationSlug,
        organizationLogoUrl: r.organizationLogoUrl ?? undefined,
      }))
  }

  /**
   * Soft-cancel a pending invitation. No DELETE policy exists on the
   * `invitation` table (by design — no hard deletes in this project), so
   * cancellation is implemented as `status = 'cancelled'`. The filter on
   * `status = 'pending'` prevents double-cancel and racing an already-
   * accepted invitation. Authorised by the admin branch of
   * `invitation_update_admin_or_invitee`.
   */
  async markCancelled(ctx: SessionContext, invitationId: string): Promise<void> {
    // Cancellable statuses: pending rows are retracted by the admin,
    // rejected rows are discarded after the invitee declined, and
    // expired rows are cleaned up by the admin from the archived
    // panel. `pending` here also covers the "derived expired" case
    // (status='pending' + expiresAt<now()) since no cron flips them
    // server-side. Accepted/cancelled are terminal: an accepted
    // invitee is already a member (use member removal instead); a
    // cancelled row is the tombstone of an earlier retraction.
    const result = await withRLS(ctx, (tx) =>
      tx
        .update(invitation)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(invitation.id, invitationId),
            eq(invitation.organizationId, ctx.orgId),
            inArray(invitation.status, ["pending", "rejected", "expired"]),
          ),
        )
        .returning({ id: invitation.id }),
    )

    if (result.length === 0) {
      throw new Error("Invitation not found or cannot be cancelled")
    }
  }

  /**
   * Narrow projection (id, email, role, status) of an invitation scoped
   * to the caller's org. Used by the resend flow which only needs those
   * four fields. Returning the full Invitation entity would leak the
   * secret `token` to the Presentation layer unnecessarily.
   */
  async findByIdForOrg(
    ctx: SessionContext,
    invitationId: string,
  ): Promise<InvitationSummary | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        })
        .from(invitation)
        .where(
          and(
            eq(invitation.id, invitationId),
            eq(invitation.organizationId, ctx.orgId),
          ),
        )
        .limit(1),
    )
    return rows[0]
      ? {
          id: rows[0].id,
          email: rows[0].email,
          role: rows[0].role as InvitableRole,
          status: rows[0].status,
          expiresAt: rows[0].expiresAt.toISOString(),
        }
      : undefined
  }

  /**
   * Look up a single pending invitation by its token, joined with the
   * inviting org. Filters: status=pending, email matches caller's JWT
   * claim, not expired. Returns undefined for any of those failing —
   * the four conditions the accept RPC also enforces. Same RLS chain
   * as findMyPending.
   */
  async findByToken(
    ctx: SessionContext,
    token: string,
  ): Promise<IncomingInvitation | undefined> {
    const callerEmail = ctx.email
    if (callerEmail === null) return undefined
    // Normalize to lowercase to match the stored value: invitations are
    // inserted lowercase (see `create()` line 72) but `ctx.email` comes
    // straight from the JWT, which can carry mixed case (Google OAuth in
    // particular). Without normalization a valid pending invitation
    // returns `undefined` and the accept-invite page renders "not found".
    // Mirrors the existing pattern in findMyPending / hasPendingForEmail.
    const normalizedEmail = callerEmail.toLowerCase()
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({
          id: invitation.id,
          role: invitation.role,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
          orgId: organization.id,
          orgName: organization.name,
          orgSlug: organization.slug,
          orgLogoUrl: organization.logoUrl,
        })
        .from(invitation)
        .innerJoin(organization, eq(invitation.organizationId, organization.id))
        .where(
          and(
            eq(invitation.token, token),
            eq(invitation.email, normalizedEmail),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .limit(1),
    )
    if (rows.length === 0) return undefined
    const row = rows[0]
    return {
      id: row.id,
      token: row.token,
      role: row.role as InvitableRole,
      expiresAt: row.expiresAt.toISOString(),
      organizationId: row.orgId,
      organizationName: row.orgName,
      organizationSlug: row.orgSlug,
      organizationLogoUrl: row.orgLogoUrl ?? undefined,
    }
  }

  /**
   * Invitee-initiated rejection. Keyed by `token` rather than id because
   * the token is what the invitee surface exposes (list-my-pending returns
   * it) and because rejecting by a scalar caller-supplied id invites
   * probing.
   *
   * The RLS policy `invitation_update_admin_or_invitee` would technically
   * allow an org admin to hit this UPDATE too, but `rejected` is an
   * invitee-side status (admins use `cancelled` via markCancelled). An
   * explicit `email = ctx.email` predicate enforces the invitee-only
   * semantic in the query itself, not just in naming — the audit trail
   * stays meaningful: `rejected` always means "the invitee said no".
   *
   * Returning no row means either the token does not match the caller's
   * email or the invitation is no longer pending — both surface as a
   * single domain error, which is enough for the UI and avoids leaking
   * detail about the underlying cause.
   */
  async markRejected(ctx: SessionContext, token: string): Promise<void> {
    if (!ctx.email) {
      throw new Error("Cannot reject invitation: caller session has no email claim")
    }
    const normalizedEmail = ctx.email.toLowerCase()

    const result = await withRLS(ctx, (tx) =>
      tx
        .update(invitation)
        .set({ status: "rejected" })
        .where(
          and(
            eq(invitation.token, token),
            eq(invitation.email, normalizedEmail),
            eq(invitation.status, "pending"),
          ),
        )
        .returning({ id: invitation.id }),
    )

    if (result.length === 0) {
      throw new Error("Invitation not found or cannot be rejected")
    }
  }

  /**
   * Seat-limit probe for the send-invitation use case. Runs as a single
   * statement with three correlated subqueries so the counts share one
   * atomic snapshot — avoiding the seat-limit race that three sequential
   * reads would expose under READ COMMITTED isolation (member or pending
   * invite committed between queries and visible only to the later one).
   */
  async getOrgSeatInfo(ctx: SessionContext): Promise<{ maxSeats: number; currentMembers: number }> {
    return withRLS(ctx, async (tx) => {
      const result = await tx.execute<{
        max_seats: number | null
        member_count: number | null
        pending_count: number | null
      }>(sql`
        select
          (select ${organization.maxSeats} from ${organization}
             where ${organization.id} = ${ctx.orgId}) as max_seats,
          (select count(*)::int from ${member}
             where ${member.organizationId} = ${ctx.orgId}
               and ${member.deletedAt} is null) as member_count,
          (select count(*)::int from ${invitation}
             where ${invitation.organizationId} = ${ctx.orgId}
               and ${invitation.status} = 'pending'
               and ${invitation.expiresAt} > now()) as pending_count
      `)

      const row = result.rows[0]
      return {
        maxSeats: row?.max_seats ?? 1,
        currentMembers: (row?.member_count ?? 0) + (row?.pending_count ?? 0),
      }
    })
  }

  async accept(token: string): Promise<{ organizationId: string }> {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token })

    if (error) throw translateAcceptError(error.message)
    if (typeof data !== "string") {
      throw new Error("accept_invitation RPC returned an unexpected payload")
    }
    return { organizationId: data }
  }
}
