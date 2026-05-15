import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Port (interface) for AiContent persistence. Defined here in the
 * Domain layer so Application use cases can depend on the contract
 * without knowing the concrete adapter. Infrastructure provides the
 * implementation:
 *
 *   - `InMemoryAiContentRepository` (current, pre-DB, R38c) — keeps
 *     a process-global array. Ignores `ctx` until R38b/R38d wire
 *     real per-org isolation.
 *   - `DrizzleAiContentRepository` (future, R38d) — persists to
 *     Postgres via `withRLS(ctx, ...)` enforcing org boundaries at
 *     the database.
 *
 * Every method takes `ctx: SessionContext` first to match the rest
 * of the project's repository convention (Property/Contact/Deal).
 * Designing the interface ctx-aware from day 1 keeps R38b and R38d
 * as adapter-only swaps — no signature churn across domain /
 * application / presentation.
 */
export interface IAiContentRepository {
  findAll(ctx: SessionContext): Promise<AiContent[]>
  findByProperty(ctx: SessionContext, propertyId: string): Promise<AiContent[]>
  create(
    ctx: SessionContext,
    data: Omit<AiContent, "id" | "createdAt">,
  ): Promise<AiContent>
  update(
    ctx: SessionContext,
    id: string,
    data: Partial<Omit<AiContent, "id" | "createdAt">>,
  ): Promise<AiContent>
  delete(ctx: SessionContext, id: string): Promise<void>
  deleteByProperty(ctx: SessionContext, propertyId: string): Promise<void>
}
