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
