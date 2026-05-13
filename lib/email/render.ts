import "server-only"
import type { ReactElement } from "react"
import { render, toPlainText } from "@react-email/render"

/**
 * Render a React Email component to both HTML (inline-styled, ready for
 * email clients) and a plain-text fallback. Producing both is best
 * practice for multipart/alternative MIME — clients that strip HTML
 * (terminal mail clients, some corporate filters, screen readers) get
 * a readable fallback.
 *
 * Derived from a single render pass: we render the component once to
 * HTML, then convert that HTML to plain text via `toPlainText`. This
 * avoids re-rendering the React tree twice, which matters as templates
 * grow in complexity. `toPlainText` is the same function
 * `@react-email/render` invokes internally when `plainText: true` is
 * passed to `render`, exported here for explicit single-pass use.
 *
 * `pretty: false` (default) keeps the HTML compact. Email size matters
 * for deliverability (some providers add anti-spam weight to large
 * messages), and human-readable HTML is not a value-add at email-client
 * scale.
 */
export interface RenderedEmail {
  html: string
  text: string
}

export async function renderEmail(react: ReactElement): Promise<RenderedEmail> {
  const html = await render(react)
  const text = toPlainText(html)
  return { html, text }
}
