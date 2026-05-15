import type { IHashtagRepository } from "@/features/ai-contents/domain/hashtag.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function addHashtagUseCase(
  ctx: SessionContext,
  repo: IHashtagRepository,
  tag: string,
): Promise<void> {
  return repo.add(ctx, tag)
}
