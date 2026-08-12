import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import type {
  IAiContentRepository,
  UpdateAiContentDTO,
} from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

export async function updateAiContentUseCase(
  ctx: SessionContext,
  repo: IAiContentRepository,
  id: string,
  data: UpdateAiContentDTO,
): Promise<AiContent> {
  return repo.update(ctx, id, data)
}
