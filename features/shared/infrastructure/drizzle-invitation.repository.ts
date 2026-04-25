import { eq, and, sql, gt } from "drizzle-orm"
import { invitation, member, organization } from "@/lib/db/schema"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { withRLS } from "./rls"
import { mapInvitationRowToEntity } from "./invitation.mapper"
import { InvitationDomainError } from "@/lib/errors/invitation-errors"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  Invitation,
  PendingInvitation,
  IncomingInvitation,
  InvitableRole,
} from "@/features/shared/domain/invitation.entity"
import type { IInvitationRepository } from "@/features/shared/domain/invitation.repository"

const INVITABLE_ROLES: readonly string[] = ["admin", "agent"]

/**
 * Translate a Postgres error raised by `accept_invitation` into a typed
 * domain error. The RPC uses distinct `raise exception` tokens so the
 * caller can surface meaningful messages without parsing the raw text.
 */
function translateAcceptError(message: string | undefined): InvitationDomainError {
  switch (message) {
    case "invitation_not_found":
      return new InvitationDomainError("accept_not_found")
    case "invitation_not_pending":
      return new InvitationDomainError("accept_not_pending")
    case "invitation_expired":
      return new InvitationDomainError("accept_expired")
    case "invitation_email_mismatch":
      return new InvitationDomainError("accept_email_mismatch")
    case "email_missing":
    case "not_authenticated":
      return new InvitationDomainError("accept_unauthenticated")
    default:
      return new InvitationDomainError("unknown")
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
    if (error) {
      // Logged for diagnostics; surfaced to the caller as a generic domain
      // error so the supabase-js error string never reaches the UI.
      console.error("[invitation.repo] check_user_exists_by_email failed:", error)
      throw new InvitationDomainError("unknown")
    }
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
    const result = await withRLS(ctx, (tx) =>
      tx
        .update(invitation)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(invitation.id, invitationId),
            eq(invitation.organizationId, ctx.orgId),
            eq(invitation.status, "pending"),
          ),
        )
        .returning({ id: invitation.id }),
    )

    if (result.length === 0) {
      throw new InvitationDomainError("not_found_or_cancelled")
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
      throw new InvitationDomainError("caller_session_no_email")
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
      throw new InvitationDomainError("not_found_or_rejected")
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
      console.error("[invitation.repo] accept_invitation returned unexpected payload:", data)
      throw new InvitationDomainError("unknown")
    }
    return { organizationId: data }
  }
}
