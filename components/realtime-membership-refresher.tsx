"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { getUserOrganizationsAction, switchActiveOrgAction } from "@/features/shared/presentation/organization-actions"

interface RealtimeMembershipRefresherProps {
  userId: string
}

type RoleChangedPayload = {
  type: "role_changed"
  organizationId: string
  organizationName: string
  newRole: "admin" | "agent"
}

type RemovedPayload = {
  type: "removed"
  organizationId: string
  organizationName: string
}

type MembershipPayload = RoleChangedPayload | RemovedPayload

const ROLE_LABEL: Record<RoleChangedPayload["newRole"], string> = {
  admin: "administrador",
  agent: "agente",
}

/**
 * Subscribes the current user to their private membership channel
 * (`user:{userId}:membership`) and reacts to role/removal events.
 *
 * Mounted unconditionally inside the dashboard layout. If Realtime is
 * unreachable the security gap (T071) is still closed by the DB-layer
 * `is_org_member()` check (drizzle/sql/017a) — this component only adds
 * the instant UX feedback, never carries the security guarantee.
 *
 * Naming: channel topic must mirror the RLS policy in
 * `drizzle/sql/018_realtime_user_membership_channel_rls.sql` and the
 * server helper `membershipChannelTopic` in
 * `features/shared/infrastructure/realtime-broadcast.ts`.
 *
 * Multi-tab behaviour: each open tab subscribes to its own channel
 * instance and processes incoming events independently. The downstream
 * actions (`refreshSession`, `switchActiveOrgAction`, `signOut`) are all
 * idempotent, so the only observable cost of N tabs is N redundant
 * server calls — never data corruption or cross-tab races. The
 * `handlingRef` guard below prevents *intra-tab* duplicate delivery
 * (network retry of the same broadcast), which is a separate concern.
 */
export function RealtimeMembershipRefresher({ userId }: RealtimeMembershipRefresherProps) {
  const router = useRouter()
  // The router instance is stable across renders but eslint-react-hooks
  // requires it in the dep array. Capture the supabase client outside the
  // effect's hot path so the channel subscription does not tear down on
  // every render.
  const supabase = getSupabaseBrowserClient()
  const handlingRef = useRef(false)

  useEffect(() => {
    const channel = supabase
      .channel(`user:${userId}:membership`, { config: { private: true } })
      .on("broadcast", { event: "membership_changed" }, async ({ payload }) => {
        const event = payload as MembershipPayload
        // Guard against duplicate event delivery (network retry, multi-tab
        // race) so we do not double-redirect or double-toast.
        if (handlingRef.current) return
        handlingRef.current = true

        try {
          await supabase.auth.refreshSession()

          if (event.type === "role_changed") {
            toast.info(`Tu rol cambió a ${ROLE_LABEL[event.newRole]}`)
            router.refresh()
            return
          }

          // type === "removed"
          toast.info(`Fuiste removido de ${event.organizationName || "la organización"}`)

          // Decide where to send the user: another active membership, or sign-out.
          // The custom_access_token_hook orphan defense (drizzle/sql/012)
          // already nulled their active_org_id claim if it pointed at the
          // org they were removed from, so the JWT is now in a safe state
          // either way.
          const remaining = await getUserOrganizationsAction()
          if (remaining.length > 0) {
            await switchActiveOrgAction(remaining[0].id)
            router.replace("/dashboard")
          } else {
            await supabase.auth.signOut()
            router.replace("/sign-in?reason=removed")
          }
        } catch (error) {
          console.error("[realtime] membership change handler failed", error)
        } finally {
          handlingRef.current = false
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, router])

  return null
}
