import "server-only"
import type { ReactNode } from "react"
import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components"
import { Footer } from "./Footer"
import { borderSubtle, brandBlack, fontStack, pageBackground, textPrimary } from "./tokens"

/**
 * Top-level wrapper for every Black Estate email. Provides:
 *   - <Html> + <Head> with the document language set to es (Spanish neutral)
 *   - <Preview> with the snippet email clients show in the inbox list
 *   - A centered 600px container — the safe maximum that renders well
 *     across Gmail, Outlook web, Outlook desktop and Apple Mail
 *   - A header that displays the product name (no logo image yet — we
 *     will host an asset when the brand is finalised; relying on a
 *     remote image too early risks broken previews in inbox lists)
 *   - A footer slot that defaults to the standard `Footer` component
 *     but accepts a customised one (e.g. with an extra security
 *     disclaimer) per template
 *
 * Why a single layout component instead of per-template Html/Body
 * boilerplate: every email shares the same wrapper, container width,
 * font stack, and footer baseline. Centralising lets us update brand
 * presentation once (logo, colour, footer copy) without auditing each
 * template.
 *
 * Styles are inline-object literals (not CSS classes) because email
 * clients strip <style> blocks and CSS files. This is the React Email
 * idiom. The `fontFamily` token is intentionally duplicated on each
 * text-emitting element because Outlook Desktop (Word rendering
 * engine) refuses to inherit it from parent elements.
 *
 * Outlook Desktop limitation: `borderRadius` is silently ignored by
 * the Word rendering engine, so the white card appears with sharp
 * corners in Outlook 2013-2021. We accept this fallback rather than
 * adding the VML <v:roundrect> workaround — the visual regression is
 * minimal and only affects a subset of the LATAM enterprise audience.
 */

export interface BrandLayoutProps {
  /**
   * Short single-line summary shown in the inbox list before the user
   * opens the email. Email clients display ~90 characters. Keep it
   * factual and unique per email type.
   */
  preview: string
  children: ReactNode
  /**
   * Optional footer override. Defaults to the standard `<Footer />`
   * with the copyright line only. Pass `<Footer extra={...} />` from
   * a template to surface an additional disclaimer (e.g. the
   * "ignore this email if you do not recognise the invitation"
   * security copy).
   */
  footer?: ReactNode
}

const styles = {
  body: {
    backgroundColor: pageBackground,
    fontFamily: fontStack,
    margin: 0,
    padding: "32px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    // borderRadius ignored by Outlook Desktop (Word engine) — see file
    // header comment for the decision to accept the sharp-corner
    // fallback.
    borderRadius: "8px",
    margin: "0 auto",
    maxWidth: "600px",
    padding: "32px",
  },
  brandSection: {
    paddingBottom: "24px",
    borderBottom: `1px solid ${borderSubtle}`,
    marginBottom: "24px",
  },
  brandText: {
    color: brandBlack,
    fontFamily: fontStack,
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    margin: 0,
  },
  contentSection: {
    color: textPrimary,
    fontFamily: fontStack,
    fontSize: "16px",
    lineHeight: "24px",
  },
}

export function BrandLayout({ preview, children, footer }: BrandLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.brandSection}>
            <Text style={styles.brandText}>Black Estate</Text>
          </Section>
          <Section style={styles.contentSection}>{children}</Section>
          {footer ?? <Footer />}
        </Container>
      </Body>
    </Html>
  )
}
