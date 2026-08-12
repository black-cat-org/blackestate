import { DealDetailHeader } from "./deal-detail-header"
import { DealDetailInfo } from "./deal-detail-info"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface DealDetailPageProps {
  deal: Deal
}

/**
 * Container that composes the header (back nav + stage badge +
 * transition actions + dropdown) and the info block (contact +
 * property + qualification + dates). The page-level route
 * (`/dashboard/deals/[id]`, R40) is expected to load the Deal via
 * `getDealByIdAction` and pass it down — keeps this component a pure
 * renderer for testability and for being usable both from the route
 * and from any future preview-pane context.
 *
 * Cross-feature sub-sections (related Appointments, Bot conversation
 * history, AI-generated content) are deferred to R40 page composition
 * because those features are still being refactored (R34 Appointments,
 * R35 Bot). Same approach as R24 contact-detail and I9 inquiry-detail.
 */
export function DealDetailPage({ deal }: DealDetailPageProps) {
  return (
    <div className="space-y-8">
      <DealDetailHeader deal={deal} />
      <DealDetailInfo deal={deal} />
    </div>
  )
}
