import type { IAiContentRepository } from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function deleteAiContentsByPropertyUseCase(
  ctx: SessionContext,
  repo: IAiContentRepository,
  propertyId: string,
): Promise<void> {
  return repo.deleteByProperty(ctx, propertyId)
}
