import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

/**
 * OAuth / email-confirmation callback for Supabase Auth (PKCE flow).
 *
 * Supabase redirects the browser here with a `code` query param. We trade
 * the code for a session via `exchangeCodeForSession`, which writes the
 * session cookies through our cookie handlers in `getSupabaseServerClient`.
 *
 * A `next` query param is honoured only when relative, so an attacker can't
 * craft a phishing redirect by passing an external URL.
 *
 * `x-forwarded-host` is respected behind a load balancer (Vercel, Fly, etc.)
 * so the redirect lands on the user-visible host, not the internal one.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  const requestedNext = searchParams.get("next") ?? "/dashboard"
  // Reject absolute URLs and protocol-relative `//evil.com` bypasses. Only
  // same-origin relative paths starting with a single `/` are allowed.
  const isSafeNext =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.startsWith("/\\")
  const next = isSafeNext ? requestedNext : "/dashboard"

  if (!code) {
    return NextResponse.redirect(`${origin}/auth-code-error`)
  }

  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth-code-error`)
  }

  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocalEnv = process.env.NODE_ENV === "development"

  if (isLocalEnv || !forwardedHost) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`https://${forwardedHost}${next}`)
}
