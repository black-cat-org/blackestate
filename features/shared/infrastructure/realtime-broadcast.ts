import "server-only"
import { getSupabaseAdmin } from "@/lib/supabase/server"

/**
 * Channel topic for the per-user membership event stream. Mirrors the RLS
 * policy defined in `drizzle/sql/018_realtime_user_membership_channel_rls.sql`
 * (`user:{auth.uid()}:membership`). Keep the constant in sync with that
 * policy — drift between the channel name here and in the policy silently
 * blocks all messages.
 */
export function membershipChannelTopic(userId: string): string {
  return `user:${userId}:membership`
}

export type MembershipChangeType = "role_changed" | "removed"

export interface MembershipChangePayload {
  type: MembershipChangeType
  organizationId: string
  organizationName: string
  newRole?: "admin" | "agent"
}

/**
 * Broadcast a membership change event to a single user's private channel
 * via Supabase Realtime.
 *
 * Uses the service-role admin client so the INSERT into `realtime.messages`
 * bypasses RLS — the only RLS we enforce on this table is the SELECT
 * policy that decides who can subscribe (own user only). The broadcast is
 * best-effort: if Realtime is unreachable we log and return without
 * throwing, because the security gap (T071) is closed by the DB-layer
 * `is_org_member()` check (drizzle/sql/017a) regardless of whether the
 * client receives the push notification. The push only improves UX.
 *
 * Caller responsibility: the action that mutates membership must finish
 * the DB write before invoking this so the client's `refreshSession()`
 * (triggered by the broadcast handler) re-evaluates a consistent state.
 */
export async function broadcastMembershipChange(
  userId: string,
  payload: MembershipChangePayload,
): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const channel = admin.channel(membershipChannelTopic(userId))
    await channel.send({
      type: "broadcast",
      event: "membership_changed",
      payload,
    })
    // The admin client opens an ephemeral channel per call; remove it so
    // the connection does not leak between requests.
    await admin.removeChannel(channel)
  } catch (error) {
    console.warn(
      `[realtime] membershipChange broadcast failed (userId=${userId}, type=${payload.type})`,
      error,
    )
  }
}
