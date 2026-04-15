import type { Lead } from "@/features/leads/domain/lead.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleLeadRepository } from "@/features/leads/infrastructure/drizzle-lead.repository"

export async function getLeadsUseCase(
  ctx: SessionContext,
): Promise<Lead[]> {
  const repo = new DrizzleLeadRepository()
  return repo.findAll(ctx)
}
