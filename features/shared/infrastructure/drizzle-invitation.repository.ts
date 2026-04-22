import { eq, and, sql, gt } from "drizzle-orm"
import { invitation, member, organization } from "@/lib/db/schema"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { withRLS } from "./rls"
import { mapInvitationRowToEntity } from "./invitation.mapper"
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
 * Translate a Postgres error raised by `accept_invitation` into a domain
 * error. The RPC uses distinct `raise exception` tokens so the caller can
 * surface meaningful messages without parsing the raw text.
 */
function translateAcceptError(message: string | undefined): Error {
  switch (message) {
    case "invitation_not_found":
      return new Error("Invitation not found")
    case "invitation_not_pending":
      return new Error("Invitation has already been processed")
    case "invitation_expired":
      return new Error("Invitation has expired")
    case "invitation_email_mismatch":
      return new Error("This invitation belongs to a different email address")
    case "email_missing":
    case "not_authenticated":
      return new Error("Not authenticated")
    default:
      return new Error(message ?? "Failed to accept invitation")
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
      throw new Error("Invitation not found or cannot be cancelled")
    }
  }

  /**
   * Invitee-initiated rejection. Keyed by `token` rather than id because
   * the token is what the invitee surface exposes (list-my-pending returns
   * it) and because rejecting by a scalar caller-supplied id invites
   * probing. The RLS policy `invitation_update_admin_or_invitee` gates
   * the UPDATE; the filter on `status = 'pending'` prevents mutating an
   * already-accepted / cancelled / expired row. Returning no row means
   * either the token does not match the caller's email (RLS hides it)
   * or the invitation is no longer pending — both surface as a single
   * domain error, which is enough for the UI and avoids leaking detail
   * about the underlying cause.
   */
  async markRejected(ctx: SessionContext, token: string): Promise<void> {
    const result = await withRLS(ctx, (tx) =>
      tx
        .update(invitation)
        .set({ status: "rejected" })
        .where(
          and(
            eq(invitation.token, token),
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
