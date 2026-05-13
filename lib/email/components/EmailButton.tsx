import "server-only"
import { Button } from "@react-email/components"
import { brandBlack, buttonForeground, fontStack } from "./tokens"

/**
 * Black Estate-styled CTA button for emails.
 *
 * `@react-email/components` ships its own `Button` primitive that
 * renders bullet-proof bordered table cell in HTML (the only reliable
 * way to render a clickable button across Outlook / Apple Mail /
 * Gmail). This wrapper applies the brand styling so every email's
 * primary action looks identical.
 *
 * `fontFamily` is declared inline on this element specifically because
 * Outlook Desktop's Word rendering engine resets button-like elements
 * to Times New Roman / Calibri and does not inherit `font-family`
 * from parent table cells. The token is imported from `./tokens` so
 * the value stays in sync with `BrandLayout`.
 */
export interface EmailButtonProps {
  href: string
  children: string
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: brandBlack,
        borderRadius: "6px",
        color: buttonForeground,
        display: "inline-block",
        fontFamily: fontStack,
        fontSize: "15px",
        fontWeight: 600,
        lineHeight: "20px",
        padding: "12px 24px",
        textAlign: "center",
        textDecoration: "none",
      }}
    >
      {children}
    </Button>
  )
}
