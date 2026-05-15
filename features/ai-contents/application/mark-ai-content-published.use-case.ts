import type {
  AiContent,
  AiPlatform,
} from "@/features/ai-contents/domain/ai-content.entity"
import type { IAiContentRepository } from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * Marks an AI content as published to the given platform. Sets
 * `publishedAt = now` and `publishedTo = platform` atomically through
 * a partial update. Lives in Application so the timestamp generation
 * is policy-controlled (not pushed into Infrastructure where adapters
 * could each implement their own clock).
 */
export async function markAiContentPublishedUseCase(
  ctx: SessionContext,
  repo: IAiContentRepository,
  id: string,
  platform: AiPlatform,
): Promise<AiContent> {
  return repo.update(ctx, id, {
    publishedAt: new Date().toISOString(),
    publishedTo: platform,
  })
}
