import { NextResponse, type NextRequest } from "next/server"
import { updateSupabaseSession } from "@/lib/supabase/middleware"

const PROTECTED_PREFIXES = ["/dashboard"] as const
const AUTH_ROUTES = ["/sign-in", "/sign-up", "/forgot-password"] as const

function startsWithAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Clones `source`'s cookies onto a new redirect response so the refreshed
 * Supabase session cookies survive the redirect hop. Without this, any
 * redirect issued in the same request that refreshed the JWT would drop
 * the new cookies and silently log the user out.
 */
function redirectPreservingCookies(source: NextResponse, url: URL): NextResponse {
  const redirect = NextResponse.redirect(url)
  source.cookies.getAll().forEach((c) => redirect.cookies.set(c))
  return redirect
}

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSupabaseSession(request)

  const { pathname } = request.nextUrl

  if (startsWithAny(pathname, PROTECTED_PREFIXES) && !claims) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.search = ""
    url.searchParams.set("next", pathname)
    return redirectPreservingCookies(response, url)
  }

  // Authenticated but no active org. Happens after the user is removed
  // from their last org (the JWT hook's orphan defense nulls the claim,
  // and `soft_delete_member_with_active_org_reset` deletes their
  // `user_active_org` row). Without this redirect the dashboard pages
  // server-error on `getSessionContext()`, leaving a blank screen — see
  // sub-plan 2026-05-11-realtime-membership-revocation.
  //
  // Route through `/auth/sign-out-removed` instead of straight to
  // `/sign-in` so the still-valid session cookie is dropped server-side
  // first. Without the sign-out hop the user kept a live but unusable
  // session: any return to `/dashboard` re-tripped this same redirect
  // (zombie session loop), and there was no way to recover without
  // manually clearing cookies. The hop route is best-effort — even a
  // signOut failure ends with the user on `/sign-in?reason=removed`.
  if (startsWithAny(pathname, PROTECTED_PREFIXES) && claims && !claims.active_org_id) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/sign-out-removed"
    url.search = ""
    return redirectPreservingCookies(response, url)
  }

  if (startsWithAny(pathname, AUTH_ROUTES) && claims && claims.active_org_id) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return redirectPreservingCookies(response, url)
  }

  return response
}

export const config = {
  // Run on every route except Next internals, static files, and public media.
  // Matching broadly ensures the session cookie is refreshed during any
  // navigation, not just protected pages.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
