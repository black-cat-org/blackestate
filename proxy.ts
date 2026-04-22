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

  if (startsWithAny(pathname, AUTH_ROUTES) && claims) {
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
