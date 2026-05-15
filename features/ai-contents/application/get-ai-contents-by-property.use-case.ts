import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import type { IAiContentRepository } from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function getAiContentsByPropertyUseCase(
  ctx: SessionContext,
  repo: IAiContentRepository,
  propertyId: string,
): Promise<AiContent[]> {
  return repo.findByProperty(ctx, propertyId)
}
