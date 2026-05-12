import "server-only"
import nodemailer, { type Transporter } from "nodemailer"
import { requireEmailEnv } from "./env"

/**
 * Singleton nodemailer SMTP runtime.
 *
 * Why a singleton on `globalThis`:
 *   - Each transporter maintains a connection pool (`pool: true`,
 *     default 5 connections); creating one per call defeats the pool
 *     and hammers the SMTP server with TCP/TLS handshakes.
 *   - `globalThis` survives Next.js HMR reloads in dev so we do not
 *     leak open SMTP sockets every time a server file is edited.
 *
 * Why a runtime object (not just the transporter):
 *   - `EMAIL_FROM` is part of the SMTP runtime configuration just like
 *     host/port/credentials. Reading it here at singleton init means
 *     a missing env var fails loud at first use, instead of being
 *     swallowed inside `sendEmail`'s try/catch and surfacing as a
 *     best-effort `{ error }` on every send.
 *
 * Why kept internal (`getEmailRuntime` is not re-exported from
 * `index.ts`):
 *   - Public API is `sendEmail` in `send.ts`. The transporter is an
 *     implementation detail and will be swapped for the Resend SDK in
 *     Fase 2 of the mailing architecture plan
 *     (`docs/plans/2026-05-12-mailing-architecture.md`). Callers
 *     should never reach for the runtime directly; only `send.ts`
 *     imports this file via the package-internal relative path.
 *
 * Port semantics:
 *   - 465 → implicit TLS, `secure: true`
 *   - 587 / 2525 → STARTTLS, `secure: false`
 *   - We do not pin a specific port; whatever the env var says is the
 *     ground truth. Mailtrap sandbox is typically 2525.
 */

export interface EmailRuntime {
  transporter: Transporter
  from: string
}

const globalForEmail = globalThis as typeof globalThis & {
  emailRuntime?: EmailRuntime
}

export function getEmailRuntime(): EmailRuntime {
  if (globalForEmail.emailRuntime) return globalForEmail.emailRuntime

  const host = requireEmailEnv("SMTP_HOST")
  const portRaw = requireEmailEnv("SMTP_PORT")
  const port = Number.parseInt(portRaw, 10)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(
      `[email] SMTP_PORT is not a valid port number (got "${portRaw}").`,
    )
  }

  const user = requireEmailEnv("SMTP_USER")
  const pass = requireEmailEnv("SMTP_PASS")
  const from = requireEmailEnv("EMAIL_FROM")

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    pool: true,
    // Defaults match nodemailer's documented values for moderate
    // throughput. The transporter is shared across the app so 5
    // connections is plenty for an SMB-tier B2B SaaS at this stage.
    maxConnections: 5,
    maxMessages: 100,
    auth: { user, pass },
  })

  globalForEmail.emailRuntime = { transporter, from }
  return globalForEmail.emailRuntime
}
