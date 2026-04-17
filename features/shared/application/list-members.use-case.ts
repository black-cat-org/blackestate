import type { SessionContext } from "@/features/shared/domain/session-context"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"
import type { IMemberRepository } from "@/features/shared/domain/member.repository"

export async function listMembersUseCase(
  ctx: SessionContext,
  repo: IMemberRepository,
): Promise<TeamMember[]> {
  return repo.findAllByOrg(ctx)
}

export async function getSeatInfoUseCase(
  ctx: SessionContext,
  repo: IMemberRepository,
): Promise<TeamSeatInfo> {
  return repo.getSeatInfo(ctx)
}
