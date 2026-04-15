import type { Lead } from "@/features/leads/domain/lead.entity"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleLeadRepository } from "@/features/leads/infrastructure/drizzle-lead.repository"

export async function updateLeadUseCase(
  ctx: SessionContext,
  id: string,
  data: Partial<Lead>,
): Promise<Lead> {
  const repo = new DrizzleLeadRepository()
  return repo.update(ctx, id, data)
}
