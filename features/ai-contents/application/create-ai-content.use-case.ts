import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import type { IAiContentRepository } from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function createAiContentUseCase(
  ctx: SessionContext,
  repo: IAiContentRepository,
  data: Omit<AiContent, "id" | "createdAt">,
): Promise<AiContent> {
  return repo.create(ctx, data)
}
