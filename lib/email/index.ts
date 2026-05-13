import "server-only"

/**
 * Public surface of the email module.
 *
 * Callers (server actions, future workflows, the Send Email Hook
 * endpoint in Fase 2) import everything they need from here:
 *
 *   import { sendEmail, BrandLayout, EmailButton } from "@/lib/email"
 *
 * Internal helpers (transport singleton, env reader, render wrapper)
 * are intentionally not re-exported. Callers should not reach for the
 * SMTP runtime directly — `sendEmail` is the single entry point.
 *
 * The `server-only` import at the top reinforces the boundary: even
 * though every internal file already declares `server-only`, having
 * the barrel itself opt in means an accidental client-side import of
 * `@/lib/email` (e.g. for a type that turns out to come from a
 * component) fails immediately rather than via a transitive guard.
 */

export { sendEmail } from "./send"
export type { SendEmailParams, SendEmailResult } from "./send"

export { BrandLayout } from "./components/BrandLayout"
export type { BrandLayoutProps } from "./components/BrandLayout"

export { EmailButton } from "./components/EmailButton"
export type { EmailButtonProps } from "./components/EmailButton"

export { Footer } from "./components/Footer"
export type { FooterProps } from "./components/Footer"

export { InfoSection } from "./components/InfoSection"
export type { InfoSectionProps } from "./components/InfoSection"
