import "server-only"
import type { ReactNode } from "react"
import { Section, Text } from "@react-email/components"
import { borderSubtle, fontStack, textMuted } from "./tokens"

/**
 * Standard email footer. Used as the default footer inside
 * `BrandLayout`; templates that need extra disclaimers (e.g. the
 * invitation email's "if you do not recognise this message, ignore it"
 * note) compose their own `<Footer>` with additional `extra` content
 * and pass it as the `footer` prop of `BrandLayout`.
 *
 * Kept separate from `BrandLayout` so it can be reused without dragging
 * the surrounding container styling, and so each template can decide
 * whether to use the default or augment it.
 *
 * Computed at module scope (not at render time) — the copyright year
 * is effectively constant for the lifetime of a process and bumping it
 * is a deploy concern, not a runtime concern.
 */

const CURRENT_YEAR = new Date().getFullYear()

const styles = {
  section: {
    borderTop: `1px solid ${borderSubtle}`,
    marginTop: "32px",
    paddingTop: "24px",
  },
  text: {
    color: textMuted,
    fontFamily: fontStack,
    fontSize: "12px",
    lineHeight: "18px",
    margin: 0,
  },
  extraText: {
    color: textMuted,
    fontFamily: fontStack,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 12px 0",
  },
}

export interface FooterProps {
  /**
   * Optional extra paragraph rendered above the standard copyright
   * line. Use for per-template disclaimers such as the security
   * "ignore this email" notice.
   */
  extra?: ReactNode
}

export function Footer({ extra }: FooterProps) {
  return (
    <Section style={styles.section}>
      {extra ? <Text style={styles.extraText}>{extra}</Text> : null}
      <Text style={styles.text}>
        © {CURRENT_YEAR} Black Estate. Este correo fue enviado por el sistema, por favor no
        respondas directamente a este mensaje.
      </Text>
    </Section>
  )
}
