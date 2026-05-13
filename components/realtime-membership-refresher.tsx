"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  getUserOrganizationsAction,
  refreshSessionAction,
  switchActiveOrgAction,
} from "@/features/shared/presentation/organization-actions"
import {
  MembershipChangeDialog,
  type MembershipChangeVariant,
} from "@/components/membership-change-dialog"

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

/**
 * Subscribes the current user to their private membership channel
 * (`user:{userId}:membership`) and surfaces a blocking dialog when a
 * role change or removal arrives. The dialog (`MembershipChangeDialog`)
 * cannot be dismissed by Esc / click-outside / X — only by the user
 * pressing "Aceptar". This guarantees they see the message before the
 * post-acknowledgement action runs (router.refresh, switch active org,
 * or sign-out).
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
 * Why a dialog instead of a toast: role and membership changes alter
 * the user's permissions and navigation. They are likely not staring
 * at the screen when the event arrives, and a toast that auto-dismisses
 * after 4s is easy to miss. A modal blocks until acknowledged.
 *
 * The JWT refresh runs as soon as the broadcast arrives — not when the
 * user clicks Aceptar — so the security state is correct immediately.
 * The dialog only gates the UX hop (refresh / org switch / sign-out).
 */
export function RealtimeMembershipRefresher({ userId }: RealtimeMembershipRefresherProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  // The JWT refresh + (for removed) fallback-org lookup happen inside
  // the broadcast handler. The dialog state below holds the prepared
  // payload + the post-ack action so clicking Aceptar runs the right
  // redirect with no extra fetches.
  const [variant, setVariant] = useState<MembershipChangeVariant | null>(null)
  const postAcknowledge = useRef<(() => Promise<void> | void) | null>(null)
  const handlingRef = useRef(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const channel = supabase
      .channel(`user:${userId}:membership`, { config: { private: true } })
      .on("broadcast", { event: "membership_changed" }, async ({ payload }) => {
        const event = payload as MembershipPayload
        // `handlingRef` only guards the async preparation block below
        // (JWT refresh + org lookup). Supabase Realtime can redeliver
        // the same broadcast across a reconnect mid-handler; this skip
        // prevents two parallel preparations clobbering each other.
        // It is intentionally NOT held while the dialog is shown to
        // the user — once `setVariant` has run, a later broadcast
        // (e.g. a removal arriving while a role-change dialog is
        // still open) should overwrite the staged variant and
        // `postAcknowledge` so the dialog reflects the latest state.
        //
        // Multi-tab note: every tab has its own `handlingRef`, so two
        // tabs receive the same broadcast and both prepare in
        // parallel. This is safe by design: `switchActiveOrgAction`
        // is an idempotent upsert (`onConflictDoUpdate`), and
        // `router.refresh` is a no-op when invoked twice. The DB
        // layer (RLS 017a + RPC 023) carries the security guarantee
        // regardless of how many tabs respond.
        if (handlingRef.current) return
        handlingRef.current = true

        try {
          // Refresh the JWT immediately — the security claims must
          // reflect the new state regardless of when the user
          // acknowledges the dialog. The proxy + RLS already enforce
          // the new state on every subsequent request. We capture the
          // post-refresh `active_org_id` so the removed branch can skip
          // a redundant `switchActiveOrgAction` when the JWT already
          // points at the fallback (the
          // `soft_delete_member_with_active_org_reset` RPC flips
          // `user_active_org` server-side, so this is the common case).
          //
          // `refreshResult.error` distinguishes a transient refresh
          // failure (network blip, rotated-token race) from a real
          // eviction. We do not block on a transient failure — the
          // dialog still surfaces and the post-ack path remains safe
          // because `switchActiveOrgAction` is idempotent.
          const refreshResult = await refreshSessionAction()
          const refreshedActiveOrgId = refreshResult.activeOrgId

          if (event.type === "role_changed") {
            postAcknowledge.current = () => {
              router.refresh()
            }
            setVariant({
              type: event.newRole === "admin" ? "role_changed_admin" : "role_changed_agent",
              organizationName: event.organizationName,
            })
            // Release the guard now so a follow-up event (e.g. an
            // immediate removal after a role bump) can replace the
            // staged variant.
            handlingRef.current = false
            return
          }

          // type === "removed"
          // Short-circuit when the refreshed JWT confirms the user has no
          // remaining active org: `getUserOrganizationsAction` calls
          // `getSessionContext()` internally, which throws when
          // `active_org_id` is null — that throw would be swallowed by
          // the outer catch and the dialog would never surface. The
          // refresh's own outcome is sufficient evidence: if the refresh
          // succeeded and minted a JWT with `active_org_id = null`, the
          // user definitively has no remaining memberships and goes
          // straight to the no-fallback path. Only when the refresh
          // succeeded but returned a non-null active_org_id (i.e. the
          // user has another org) do we fetch the org list to render the
          // fallback name. When the refresh itself failed (transient),
          // we still attempt the lookup — better to surface the dialog
          // than to silently sign the user out on a network blip.
          if (!refreshResult.error && refreshedActiveOrgId === null) {
            postAcknowledge.current = async () => {
              await supabase.auth.signOut()
              router.replace("/sign-in?reason=removed")
            }
            setVariant({
              type: "removed_no_fallback",
              organizationName: event.organizationName,
            })
            handlingRef.current = false
            return
          }

          // Decide the post-ack action up front so the dialog copy
          // accurately reflects what will happen on click.
          const remaining = await getUserOrganizationsAction()
          if (remaining.length > 0) {
            const fallback = remaining[0]
            // Skip the redundant switchActiveOrgAction when the freshly
            // minted JWT already targets the fallback. Both the client
            // (`getUserOrganizationsAction`) and the server RPC
            // (`soft_delete_member_with_active_org_reset`) pick the
            // user's oldest active membership, so this is the common
            // path. When the refresh itself failed we conservatively
            // call switchActiveOrgAction (idempotent) so a missed
            // refresh does not strand the client on a stale claim.
            const needsSwitch = refreshResult.error || refreshedActiveOrgId !== fallback.id
            postAcknowledge.current = async () => {
              if (needsSwitch) {
                await switchActiveOrgAction(fallback.id)
              }
              // Stay on the current route. router.refresh re-runs server
              // components against the new active org so the page
              // re-renders with the fallback's data. Most dashboard
              // routes are org-agnostic (settings, properties list,
              // leads list) and re-render cleanly. The rare org-scoped
              // deep link (e.g. /dashboard/properties/{id} for an entity
              // in the removed org) will surface as an empty / not-found
              // state because RLS withholds the row — preferable to
              // hard-redirecting the user away from where they were
              // working.
              router.refresh()
            }
            setVariant({
              type: "removed_with_fallback",
              organizationName: event.organizationName,
              fallbackOrganizationName: fallback.name,
            })
          } else {
            postAcknowledge.current = async () => {
              await supabase.auth.signOut()
              router.replace("/sign-in?reason=removed")
            }
            setVariant({
              type: "removed_no_fallback",
              organizationName: event.organizationName,
            })
          }
          // Release the guard for "removed" too — see role_changed
          // branch comment. A subsequent removal broadcast for the
          // same org is a no-op (variant content is identical); a
          // broadcast for a different org would correctly replace it.
          handlingRef.current = false
        } catch (error) {
          console.error("[realtime] membership change handler failed", error)
          // Reset the guard so a retry has a chance.
          handlingRef.current = false
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // Intentionally only re-subscribe when the userId changes.
    // `supabase` is a `globalThis` singleton and `router` is documented
    // as a stable reference; including them in the dep array risked
    // tearing down and recreating the channel on unrelated re-renders,
    // which would reset `handlingRef` mid-flight and allow a
    // mid-reconnect duplicate broadcast to slip through. Both are
    // captured in closures inside the handler and the cleanup below.
  }, [userId])

  function handleAcknowledge() {
    const action = postAcknowledge.current
    postAcknowledge.current = null
    startTransition(async () => {
      try {
        if (action) await action()
      } finally {
        // Close the dialog only after the post-ack action settles, so
        // the user sees the spinner state on Aceptar instead of a
        // flash-of-old-content during the redirect.
        setVariant(null)
        handlingRef.current = false
      }
    })
  }

  return (
    <MembershipChangeDialog
      variant={variant}
      onAcknowledge={handleAcknowledge}
      isPending={isPending}
    />
  )
}
