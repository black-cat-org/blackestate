"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, MailCheck } from "lucide-react"

/**
 * Cooldown length before a user can ask for another confirmation email.
 * Matches the industry norm (Clerk/Stripe/Vercel use 30s). The full
 * Supabase rate-limit is still enforced server-side — this just prevents
 * impatient double-clicks from burning through it.
 */
const COOLDOWN_SECONDS = 30

/** Supabase OTP resend types we surface today. Email change is not in scope. */
type ResendType = "signup" | "email_change"

interface Props {
  /** Address the confirmation email will be sent to. */
  email: string
  /** Supabase OTP type. Defaults to `signup`, which is the 95% case. */
  type?: ResendType
  /** Controls the button chrome — an outline button or a tighter link-style text button. */
  variant?: "outline" | "link"
  /** Optional CSS hook for layout in the parent. */
  className?: string
}

/** Storage key so the cooldown survives refresh + cross-tab. */
function cooldownKey(email: string): string {
  return `auth:resend:cooldown:${email.trim().toLowerCase()}`
}

function readCooldownRemaining(email: string): number {
  if (typeof window === "undefined") return 0
  const raw = window.sessionStorage.getItem(cooldownKey(email))
  if (!raw) return 0
  const until = Number.parseInt(raw, 10)
  if (Number.isNaN(until)) return 0
  const remaining = Math.ceil((until - Date.now()) / 1000)
  return remaining > 0 ? remaining : 0
}

function writeCooldown(email: string): void {
  if (typeof window === "undefined") return
  const until = Date.now() + COOLDOWN_SECONDS * 1000
  window.sessionStorage.setItem(cooldownKey(email), String(until))
}

/**
 * Reusable button that triggers `supabase.auth.resend` for signup / email-change
 * confirmation emails. Shows a live countdown during cooldown and persists it
 * in `sessionStorage` so a refresh doesn't let the user click again immediately.
 *
 * Used in three places:
 *   1. Sign-in error recovery (when GoTrue returns `email_not_confirmed`).
 *   2. `/auth-code-error` (token expired / already consumed).
 *   3. "Revisa tu correo" screen after signup.
 */
export function ResendConfirmationButton({
  email,
  type = "signup",
  variant = "outline",
  className,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState(0)
  // Prevent setState after unmount for the in-flight resend call. React 19
  // no longer throws on stale setState, but guarding keeps the mental model
  // clean and avoids log noise if a future version tightens this.
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Hydrate cooldown from sessionStorage on mount and tick once per second.
  useEffect(() => {
    setRemaining(readCooldownRemaining(email))
    // `useEffect` never runs server-side, so `window` is always defined
    // here. The guard keeps the pattern consistent with the helpers above
    // and guards against hypothetical test environments without timers.
    if (typeof window === "undefined") return
    const interval = window.setInterval(() => {
      setRemaining(readCooldownRemaining(email))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [email])

  const handleClick = useCallback(async () => {
    // The button's `disabled` attribute already blocks clicks when
    // `loading || remaining > 0 || !email`, so we only need the email
    // guard here as defense-in-depth (the prop can race against render).
    if (!email || remaining > 0) return

    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.resend({
        type,
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })

      if (!isMountedRef.current) return

      if (error) {
        // Supabase may still 429 if its own rate limit kicks in. Surface a
        // friendly message either way — we never leak whether the address
        // is registered (anti-enumeration is respected by the SDK).
        toast.error(
          error.status === 429
            ? "Demasiados intentos. Esperá unos minutos antes de reenviar."
            : "No pudimos reenviar el correo. Intentá de nuevo.",
        )
        return
      }

      writeCooldown(email)
      setRemaining(COOLDOWN_SECONDS)
      toast.success(`Te enviamos un nuevo enlace a ${email}`)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [email, remaining, type])

  const disabled = loading || remaining > 0 || !email

  const label = loading
    ? "Enviando..."
    : remaining > 0
      ? `Reenviar en ${remaining}s`
      : "Reenviar correo de confirmación"

  // Screen-reader-only live region. Announces only when the cooldown
  // starts (at COOLDOWN_SECONDS) and when it ends (at 0) — NOT every
  // tick, which would be extremely disruptive. The visible label still
  // shows a live countdown for sighted users.
  const announcement =
    remaining === COOLDOWN_SECONDS
      ? `Enviamos un nuevo enlace a ${email}. Podrás reenviar en ${COOLDOWN_SECONDS} segundos.`
      : remaining === 0 && loading === false
        ? ""
        : ""

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={handleClick}
        disabled={disabled}
      >
        {loading ? <Loader2 className="animate-spin" /> : <MailCheck className="size-4" />}
        {label}
      </Button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  )
}
