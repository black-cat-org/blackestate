import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import type {
  CreateAiContentDTO,
  IAiContentRepository,
} from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Re-exported here so Presentation actions can refer to the input
 * shape by a single name without reaching back into the Domain
 * layer for type-only imports (cleaner module graph).
 */
export type CreateAiContentInput = CreateAiContentDTO

export async function createAiContentUseCase(
  ctx: SessionContext,
  repo: IAiContentRepository,
  data: CreateAiContentInput,
): Promise<AiContent> {
  return repo.create(ctx, data)
}
