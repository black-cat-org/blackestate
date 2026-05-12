import "server-only"
import type { ReactElement } from "react"
import { getEmailRuntime } from "./transport"
import { renderEmail } from "./render"

/**
 * Public API of the email module.
 *
 * `sendEmail` is the only function callers should reach for. It takes a
 * React Email component, renders it (HTML + plain-text fallback) and
 * hands the multipart message to the SMTP transporter.
 *
 * Best-effort delivery for transport failures, fail-loud for config
 * errors. The split matters:
 *
 *   - **Config errors** (missing SMTP_HOST, invalid SMTP_PORT, missing
 *     EMAIL_FROM, etc.) come from `getEmailRuntime()` which runs
 *     before the try/catch. They throw uncaught — these are
 *     deployment bugs that should fail at first send so they surface
 *     immediately, not get swallowed as transient mail failures.
 *
 *   - **Transport failures** (SMTP refused, network blip, render
 *     error) come from inside the try block. They return as
 *     `{ success: false, error }` so the caller can log + continue
 *     instead of tearing down their primary flow.
 *
 * The return type is a discriminated union so TypeScript forces
 * callers to branch on `result.success` before reading `messageId` or
 * `error`. A caller that destructures `const { messageId } = ...`
 * without checking will get a type error rather than silently
 * ignoring failures.
 *
 * When this module is migrated to the Resend SDK (Fase 2 of
 * `docs/plans/2026-05-12-mailing-architecture.md`), only the body of
 * this function and `transport.ts` change. Callers and templates stay
 * intact.
 */
export interface SendEmailParams {
  to: string | string[]
  subject: string
  react: ReactElement
  /** Optional Reply-To header. */
  replyTo?: string
}

export type SendEmailResult =
  | { success: true; messageId: string }
  | { success: false; error: Error }

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  // Read runtime config outside the try/catch so a missing env var
  // throws loud at first send instead of being swallowed as a
  // best-effort delivery failure.
  const { transporter, from } = getEmailRuntime()

  try {
    const { html, text } = await renderEmail(params.react)

    const info = await transporter.sendMail({
      from,
      to: params.to,
      replyTo: params.replyTo,
      subject: params.subject,
      html,
      text,
    })

    return { success: true, messageId: info.messageId }
  } catch (rawError) {
    const error = rawError instanceof Error ? rawError : new Error(String(rawError))
    // Log subject + recipient count only — never the addresses
    // themselves. Recipient emails are PII; server log retention may
    // expose them to ops engineers indirectly. The count + subject is
    // enough to correlate with the calling action's audit log if one
    // is needed for debugging.
    const recipientCount = Array.isArray(params.to) ? params.to.length : 1
    console.error(
      `[email] sendEmail failed (subject="${params.subject}", recipients=${recipientCount})`,
      error,
    )
    return { success: false, error }
  }
}
