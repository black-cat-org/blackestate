import type { IAiContentRepository } from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function deleteAiContentUseCase(
  ctx: SessionContext,
  repo: IAiContentRepository,
  id: string,
): Promise<void> {
  return repo.delete(ctx, id)
}
