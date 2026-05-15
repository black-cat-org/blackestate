"use client"

import { Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { KanbanSquare, Table as TableIcon } from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { DealKanban } from "./deal-kanban"
import { DealDataTable } from "./deal-data-table"
import type { Deal } from "@/features/deals/domain/deal.entity"

interface DealBoardProps {
  deals: Deal[]
}

type DealView = "kanban" | "table"
const DEAL_VIEWS: ReadonlyArray<DealView> = ["kanban", "table"]
const DEFAULT_VIEW: DealView = "kanban"
const VIEW_PARAM = "view"

function parseView(raw: string | null): DealView {
  return (DEAL_VIEWS as ReadonlyArray<string>).includes(raw ?? "")
    ? (raw as DealView)
    : DEFAULT_VIEW
}

/**
 * Inner shell that owns `useSearchParams()`. Lives behind a Suspense
 * boundary in the public `DealBoard` export so callers (R40 page)
 * cannot accidentally mount it from a server component without a
 * Suspense parent — Next.js 16 opts the whole route segment out of
 * static rendering if any `useSearchParams()` consumer is not under
 * Suspense. Wrapping it here makes the requirement self-contained.
 */
function DealBoardInner({ deals }: DealBoardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = parseView(searchParams.get(VIEW_PARAM))

  const handleViewChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === DEFAULT_VIEW) {
      params.delete(VIEW_PARAM)
    } else {
      params.set(VIEW_PARAM, next)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <Tabs value={view} onValueChange={handleViewChange} className="space-y-4">
      <div className="flex justify-end">
        <TabsList>
          <TabsTrigger value="kanban">
            <KanbanSquare className="mr-2 size-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="table">
            <TableIcon className="mr-2 size-4" />
            Tabla
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="kanban">
        <DealKanban deals={deals} />
      </TabsContent>
      <TabsContent value="table">
        <DealDataTable deals={deals} />
      </TabsContent>
    </Tabs>
  )
}

/**
 * Top-level Deal board composer. Owns the Kanban ↔ Table view toggle
 * and dispatches to the underlying surface. Data fetching lives in
 * the page route (R40); this component is presentational.
 *
 * View preference persisted in the URL via `?view=kanban|table`:
 *   - shareable links carry the agent's preferred surface
 *   - survives reload without client storage hydration mismatches
 *   - SSR-friendly (the parent server component can read the param
 *     and render the matching default before hydration)
 *
 * Both surfaces consume the same `deals` array (pre-filtered active
 * by the parent via `findAllActive`). The archive view (won/lost) is
 * a separate concern deferred to a future ticket — keeping a single
 * source here avoids state duplication and matches the R28 design
 * boundary (Kanban shows non-terminal Deals only).
 *
 * `<TabsContent>` mounts/unmounts the inactive surface on switch
 * (Radix default `forceMount={false}`). Toggling while a Kanban drag
 * is in flight tears down the DndContext mid-drag — acceptable
 * because the toggle is a deliberate user action, not an incidental
 * side effect. The mirror semantics also free the Kanban from having
 * to render hidden when the table is active (perf + cleaner DOM).
 *
 * The component wraps `DealBoardInner` in `<Suspense>` so callers
 * never need to know about `useSearchParams()`'s Suspense requirement
 * — a missed Suspense at the page level would silently opt the route
 * out of static rendering in Next.js 16.
 */
export function DealBoard({ deals }: DealBoardProps) {
  return (
    <Suspense fallback={null}>
      <DealBoardInner deals={deals} />
    </Suspense>
  )
}
