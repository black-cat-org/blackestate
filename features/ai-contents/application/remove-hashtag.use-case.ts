import type { IHashtagRepository } from "@/features/ai-contents/domain/hashtag.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function removeHashtagUseCase(
  ctx: SessionContext,
  repo: IHashtagRepository,
  tag: string,
): Promise<void> {
  return repo.remove(ctx, tag)
}
