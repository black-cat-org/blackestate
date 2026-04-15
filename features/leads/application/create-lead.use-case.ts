import type { Lead } from "@/features/leads/domain/lead.entity"
import type { CreateLeadDTO } from "@/features/leads/domain/lead.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzleLeadRepository } from "@/features/leads/infrastructure/drizzle-lead.repository"

export async function createLeadUseCase(
  ctx: SessionContext,
  data: CreateLeadDTO,
): Promise<Lead> {
  const repo = new DrizzleLeadRepository()
  return repo.create(ctx, data)
}
