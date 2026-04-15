import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleLeadRepository } from "@/features/leads/infrastructure/drizzle-lead.repository"

export async function deleteLeadUseCase(
  ctx: SessionContext,
  id: string,
): Promise<void> {
  const repo = new DrizzleLeadRepository()
  return repo.softDelete(ctx, id)
}
