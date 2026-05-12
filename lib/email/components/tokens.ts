import "server-only"

/**
 * Inline-friendly style tokens shared across the email primitives.
 *
 * Email clients strip <style> blocks and CSS files, so every tokenised
 * value lives here as a TypeScript constant and is applied through the
 * component's inline `style` object. Centralising the small set we
 * actually share avoids each primitive duplicating the same string —
 * the duplication trap is most painful for `fontFamily`, which Outlook
 * Desktop refuses to inherit from parent elements (resets to Times New
 * Roman / Calibri on table cells and buttons unless declared inline
 * on the element itself).
 */

/**
 * System-font stack tuned for LATAM Spanish clients. Falls back to
 * Outlook's default Arial chain on Windows and Apple Mail's default on
 * macOS/iOS, both of which render Spanish accented characters cleanly.
 */
export const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

/** Brand black for headings and CTA button background. */
export const brandBlack = "#18181b"

/** Body text colour (zinc-800 equivalent — same as the UI design). */
export const textPrimary = "#27272a"

/** Muted footer text colour (zinc-500). */
export const textMuted = "#71717a"

/** Light border / divider colour (zinc-200). */
export const borderSubtle = "#e4e4e7"

/** Page background that frames the white container card. */
export const pageBackground = "#f4f4f5"

/** Inverted text on the brand-black button. */
export const buttonForeground = "#fafafa"
