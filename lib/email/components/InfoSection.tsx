import "server-only"
import type { ReactNode } from "react"
import { Heading, Section, Text } from "@react-email/components"
import { fontStack, textPrimary } from "./tokens"

/**
 * Reusable text block for the body of an email. Provides an optional
 * subheading + one or more paragraphs with the brand typography
 * applied inline (Outlook does not inherit `font-family` from parent
 * elements, so each text node declares it explicitly).
 *
 * Use this when a template has multiple distinct sections (e.g. a
 * personal greeting, then a CTA section, then a "what happens next"
 * section). For single-paragraph templates the raw `<Text>` from
 * `@react-email/components` is enough — InfoSection adds structure,
 * not styling primitives.
 */

const styles = {
  section: {
    margin: "0 0 20px 0",
  },
  heading: {
    color: textPrimary,
    fontFamily: fontStack,
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: "26px",
    margin: "0 0 8px 0",
  },
  paragraph: {
    color: textPrimary,
    fontFamily: fontStack,
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 12px 0",
  },
}

export interface InfoSectionProps {
  /** Optional subheading. Renders as <h2>. */
  title?: string
  /**
   * Body content. Pass a string for a single paragraph, or one or more
   * `<Text>` / formatted nodes for richer content (the parent template
   * controls the structure).
   */
  children: ReactNode
}

export function InfoSection({ title, children }: InfoSectionProps) {
  return (
    <Section style={styles.section}>
      {title ? (
        <Heading as="h2" style={styles.heading}>
          {title}
        </Heading>
      ) : null}
      {typeof children === "string" ? (
        <Text style={styles.paragraph}>{children}</Text>
      ) : (
        children
      )}
    </Section>
  )
}
