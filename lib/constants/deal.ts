import type {
  DealSource,
  DealStage,
} from "@/features/deals/domain/deal.entity"

/**
 * User-facing labels for the Deal funnel stages. The domain union
 * lives in English; the Spanish dictionary is the single source of
 * truth for every UI surface (Kanban column header, badge, dialogs,
 * promote flow).
 *
 * The `Record<DealStage, string>` shape makes adding a new stage a
 * compile error here — same pattern as `INQUIRY_STATUS_LABELS` and
 * `PREFERRED_CHANNEL_LABELS`.
 */
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  visit_scheduled: "Visita agendada",
  negotiation: "Negociación",
  reserved: "Reservada",
  won: "Ganada",
  lost: "Perdida",
}

/**
 * Tailwind class fragments for the stage badge. Lives next to the
 * labels so a new stage forces both the visual and the copy to be
 * defined at the same time — same pattern as `INQUIRY_STATUS_BADGE_CLASSES`.
 *
 * Color logic:
 *   - Active stages use cool / progress colors (blue → amber → indigo)
 *     to suggest the funnel motion.
 *   - `won` is emerald (success).
 *   - `lost` is zinc (muted/closed).
 */
export const DEAL_STAGE_BADGE_CLASSES: Record<DealStage, string> = {
  visit_scheduled:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
  negotiation:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  reserved:
    "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  won: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  lost: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
}

/**
 * Tailwind class fragments for the Kanban column drop-indicator
 * (consumed by `deal-kanban-column` when `isOver`). Colors mirror
 * `DEAL_STAGE_BADGE_CLASSES` for visual continuity between the
 * header badge and the drop affordance.
 *
 * `won` and `lost` are kept for `Record<DealStage, string>` type
 * exhaustiveness even though terminal stages are NOT rendered as
 * Kanban columns per R28 design decision — those Deals live in the
 * archive view. Including them keeps the type stable if the design
 * ever changes.
 */
export const DEAL_STAGE_DROP_INDICATOR_CLASSES: Record<DealStage, string> = {
  visit_scheduled: "ring-blue-400/60 bg-blue-50/40 dark:bg-blue-950/30",
  negotiation: "ring-amber-400/60 bg-amber-50/40 dark:bg-amber-950/30",
  reserved: "ring-indigo-400/60 bg-indigo-50/40 dark:bg-indigo-950/30",
  won: "ring-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/30",
  lost: "ring-zinc-400/60 bg-zinc-50/40 dark:bg-zinc-950/30",
}

/**
 * User-facing labels for the Deal source enum. Subset of
 * `INQUIRY_SOURCE_LABELS` — Deal omits `public_form`, `bot`, `manual`
 * because those are early-capture channels that live on the Inquiry
 * entity instead.
 */
export const DEAL_SOURCE_LABELS: Record<DealSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  google: "Google",
  referral: "Referido",
  direct: "Directo",
}
