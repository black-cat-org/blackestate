import type { Lead } from "@/features/leads/domain/lead.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleLeadRepository } from "@/features/leads/infrastructure/drizzle-lead.repository"

export async function getLeadByIdUseCase(
  ctx: SessionContext,
  id: string,
): Promise<Lead | undefined> {
  const repo = new DrizzleLeadRepository()
  return repo.findById(ctx, id)
}
