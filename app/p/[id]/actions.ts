"use server"

import { trackVisitAction as trackVisit } from "@/features/leads/presentation/public-actions"

/**
 * The public-form Inquiry submission no longer routes through this
 * page-level action — `LandingContactForm` imports
 * `createPublicInquiryAction` from
 * `@/features/inquiries/presentation/public-actions` directly. A
 * passthrough wrapper here was dead indirection (no auth guard, no
 * input transform, no extra error mapping) and added one frame to
 * every client-→-server-→-RPC call.
 *
 * `trackVisitAction` stays here as a thin wrapper over the legacy
 * `trackVisit` use case — its `{ success }` shape is preserved
 * because the analytics surface is fire-and-forget and the visitor
 * UX doesn't react to its outcome.
 */
export async function trackVisitAction(propertyId: string, source: string | null) {
  try {
    await trackVisit(propertyId, source)
    return { success: true }
  } catch {
    return { success: false }
  }
}
