import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const VALID_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "invite",
  "recovery",
  "email_change",
])

const DEFAULT_REDIRECT: Record<string, string> = {
  email: "/dashboard",
  invite: "/dashboard",
  recovery: "/reset-password",
  email_change: "/dashboard/settings",
}

function safeRedirect(value: string | null, fallback: string): string {
  if (!value) return fallback
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback
  }
  return value
}

/**
 * Email verification endpoint using token_hash (not ConfirmationURL).
 *
 * Gmail and other email clients pre-fetch links for malware scanning.
 * The default {{ .ConfirmationURL }} points to Supabase's /auth/v1/verify
 * which consumes the one-time token on prefetch, leaving the user with
 * otp_expired when they actually click. This route receives {{ .TokenHash }}
 * instead and calls verifyOtp() server-side — the token is only consumed
 * when the user's browser actually visits this URL.
 *
 * Email templates must use:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>
 */
function resolveBaseUrl(request: NextRequest, origin: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocalEnv = process.env.NODE_ENV === "development"
  if (isLocalEnv || !forwardedHost) return origin
  return `https://${forwardedHost}`
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const rawType = searchParams.get("type")
  const next = searchParams.get("next")

  const baseUrl = resolveBaseUrl(request, origin)

  if (!tokenHash || !rawType || !VALID_OTP_TYPES.has(rawType as EmailOtpType)) {
    return NextResponse.redirect(`${baseUrl}/auth-code-error`)
  }

  const type = rawType as EmailOtpType

  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    return NextResponse.redirect(`${baseUrl}/auth-code-error`)
  }

  const fallback = DEFAULT_REDIRECT[type] ?? "/dashboard"
  const destination = safeRedirect(next, fallback)

  return NextResponse.redirect(`${baseUrl}${destination}`)
}
