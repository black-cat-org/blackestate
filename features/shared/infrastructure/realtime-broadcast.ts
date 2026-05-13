import "server-only"
import { requireSupabaseEnv } from "@/lib/supabase/env"

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
 * Uses the Realtime HTTP REST endpoint (`POST /realtime/v1/api/broadcast`)
 * with the service_role key. We intentionally do NOT use the
 * `supabase.channel(topic).send(...)` JS API here: that path is meant
 * for client connections and silently falls back to the REST API
 * **without** the `private: true` flag — broadcasts then land on the
 * public topic while the subscriber listens to the private topic, and
 * the message is lost without any error. The REST endpoint accepts the
 * `private` flag explicitly, which is required for the message to reach
 * subscribers that joined the channel with `{ private: true }`.
 *
 * Best-effort: if Realtime is unreachable we log and return without
 * throwing. The security gap (T071) is closed by the DB-layer
 * `is_org_member()` check (drizzle/sql/017a) regardless of whether the
 * client receives this push. The push only improves UX.
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
    const supabaseUrl = requireSupabaseEnv("SUPABASE_URL")
    const serviceKey = requireSupabaseEnv("SUPABASE_SERVICE_ROLE_KEY")

    const response = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: membershipChannelTopic(userId),
            event: "membership_changed",
            payload,
            private: true,
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.warn(
        `[realtime] membershipChange broadcast non-2xx (userId=${userId}, type=${payload.type}, status=${response.status})`,
        body,
      )
    }
  } catch (error) {
    console.warn(
      `[realtime] membershipChange broadcast failed (userId=${userId}, type=${payload.type})`,
      error,
    )
  }
}
