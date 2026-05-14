import type {
  InquirySource,
  InquiryStatus,
} from "@/features/inquiries/domain/inquiry.entity"

/**
 * User-facing labels for the `status` lifecycle of an Inquiry. The
 * domain union lives in English; the Spanish dictionary is the single
 * source of truth for every UI surface (badge, filter, action menu).
 *
 * The `Record<InquiryStatus, …>` shape makes adding a new status a
 * compile error here — same pattern as Contact's
 * `PREFERRED_CHANNEL_LABELS`.
 */
export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  open: "Abierta",
  discarded: "Descartada",
  promoted: "Promovida",
}

/**
 * Tailwind class fragments for the status badge. Lives next to the
 * labels so a new status forces both the visual and the copy to be
 * defined at the same time.
 *
 * Colors map to Tailwind v4 design tokens that the rest of the dashboard
 * already uses for related states (success/warning/destructive), so the
 * inquiry palette stays consistent with appointments and properties.
 */
export const INQUIRY_STATUS_BADGE_CLASSES: Record<InquiryStatus, string> = {
  open: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
  discarded:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
  promoted:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
}

/**
 * User-facing labels for every channel through which an Inquiry can
 * enter the system. Superset of `DealSource` (which omits
 * `public_form`, `bot`, `manual` — the early capture-only channels).
 */
export const INQUIRY_SOURCE_LABELS: Record<InquirySource, string> = {
  public_form: "Form público",
  bot: "Bot WhatsApp",
  manual: "Manual",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  google: "Google",
  referral: "Referido",
  direct: "Directo",
}
