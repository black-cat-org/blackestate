import type { IHashtagRepository } from "@/features/ai-contents/domain/hashtag.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function addHashtagsUseCase(
  ctx: SessionContext,
  repo: IHashtagRepository,
  tags: string[],
): Promise<void> {
  return repo.addMany(ctx, tags)
}
