import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Hop route for users whose `active_org_id` claim is null after being
 * removed from their last (or active) org. The proxy (`proxy.ts`) sends
 * such requests here instead of straight to `/sign-in` so the session
 * cookies are dropped before the user lands on the auth surface — a
 * lingering valid cookie with a null org claim produced a "zombie
 * session" loop where the proxy kept bouncing the user back to sign-in
 * without a path to recover.
 *
 * Why a dedicated route instead of inlining the signOut in the proxy:
 *   - `supabase.auth.signOut()` clears cookies via the @supabase/ssr
 *     `setAll` cookie handler. That handler is wired in
 *     `getSupabaseServerClient`, which depends on `next/headers` (only
 *     available in route handlers / server components / actions, NOT in
 *     middleware/Edge Runtime). Calling it from the proxy is unsafe.
 *   - Concentrating the sign-out path in a route keeps the proxy thin
 *     (its only job is "where should this request go?") and gives us a
 *     single place to evolve the eviction UX (e.g. add audit logging).
 *
 * The route is GET-only because the proxy issues a redirect (GET). It
 * is intentionally unauthenticated-tolerant: an already-signed-out user
 * still gets the clean `/sign-in?reason=removed` landing.
 */
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  // Best-effort: a signOut failure here (e.g. transient network blip
  // talking to Supabase Auth) does not block the redirect. The redirect
  // target (`/sign-in`) is itself an auth route, and the proxy will
  // re-attempt the eviction on the next request if cookies somehow
  // survived.
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error("[auth/sign-out-removed] signOut failed:", error)
  }
  const url = request.nextUrl.clone()
  url.pathname = "/sign-in"
  url.search = ""
  url.searchParams.set("reason", "removed")
  return NextResponse.redirect(url)
}
