import type { IHashtagRepository } from "@/features/ai-contents/domain/hashtag.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function getHashtagsUseCase(
  ctx: SessionContext,
  repo: IHashtagRepository,
): Promise<string[]> {
  return repo.findAll(ctx)
}
