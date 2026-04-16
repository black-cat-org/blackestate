import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { requireSupabaseEnv } from "./env"

export interface SupabaseSessionResult {
  response: NextResponse
  /** Decoded JWT claims for the authenticated user, or `null` if unauthenticated. */
  claims: Record<string, unknown> | null
}

/**
 * Supabase session refresh for the Next.js proxy (Edge Runtime).
 *
 * Reads the session cookie, refreshes the JWT if expired (writing new
 * cookies to both the forwarded request and the outgoing response), and
 * returns the decoded claims for downstream routing decisions (e.g. redirects
 * for protected pages).
 *
 * The call to `supabase.auth.getClaims()` is what triggers the refresh. It
 * MUST run immediately after `createServerClient` — any intervening logic
 * risks using a stale session and causes hard-to-debug logouts.
 *
 * IMPORTANT: Callers must use the returned `response` object as-is. If they
 * create their own response (e.g. `NextResponse.redirect`), they MUST copy
 * cookies from this `response` onto it — otherwise the refresh is lost and
 * the browser and server go out of sync.
 *
 * Edge-safe: this module intentionally avoids `server-only` so it can be
 * imported from the proxy. Only `@supabase/ssr` and `next/server` are used,
 * both of which run in the Edge Runtime.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<SupabaseSessionResult> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireSupabaseEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
          if (headers) {
            for (const [key, value] of Object.entries(headers)) {
              response.headers.set(key, value)
            }
          }
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()

  return { response, claims: (data?.claims as Record<string, unknown>) ?? null }
}
