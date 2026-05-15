"use server"

import { addHashtagUseCase } from "@/features/ai-contents/application/add-hashtag.use-case"
import { addHashtagsUseCase } from "@/features/ai-contents/application/add-hashtags.use-case"
import { createAiContentUseCase } from "@/features/ai-contents/application/create-ai-content.use-case"
import { deleteAiContentUseCase } from "@/features/ai-contents/application/delete-ai-content.use-case"
import { deleteAiContentsByPropertyUseCase } from "@/features/ai-contents/application/delete-ai-contents-by-property.use-case"
import { getAiContentsUseCase } from "@/features/ai-contents/application/get-ai-contents.use-case"
import { getAiContentsByPropertyUseCase } from "@/features/ai-contents/application/get-ai-contents-by-property.use-case"
import { getHashtagsUseCase } from "@/features/ai-contents/application/get-hashtags.use-case"
import { markAiContentPublishedUseCase } from "@/features/ai-contents/application/mark-ai-content-published.use-case"
import { removeHashtagUseCase } from "@/features/ai-contents/application/remove-hashtag.use-case"
import { updateAiContentUseCase } from "@/features/ai-contents/application/update-ai-content.use-case"
import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import { InMemoryAiContentRepository } from "@/features/ai-contents/infrastructure/in-memory-ai-content.repository"
import { InMemoryHashtagRepository } from "@/features/ai-contents/infrastructure/in-memory-hashtag.repository"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"

// Module-level singletons. The in-memory adapters hold process-global
// state so a single instance is reused across the request lifetime —
// this mirrors the singleton pattern used by other features'
// Drizzle repositories (e.g. `DrizzleDealRepository` in
// `features/deals/presentation/actions.ts`). R38d will swap these
// for Drizzle adapters with zero interface churn at the call sites.
const aiContentRepo = new InMemoryAiContentRepository()
const hashtagRepo = new InMemoryHashtagRepository()

// ---------------------------------------------------------------------------
// AI content actions
// ---------------------------------------------------------------------------

export async function getAiContentsAction(): Promise<AiContent[]> {
  const ctx = await getSessionContext()
  return getAiContentsUseCase(ctx, aiContentRepo)
}

export async function getAiContentsByPropertyAction(propertyId: string): Promise<AiContent[]> {
  const ctx = await getSessionContext()
  return getAiContentsByPropertyUseCase(ctx, aiContentRepo, propertyId)
}

export async function createAiContentAction(
  data: Omit<AiContent, "id" | "createdAt">,
): Promise<AiContent> {
  const ctx = await getSessionContext()
  return createAiContentUseCase(ctx, aiContentRepo, data)
}

export async function updateAiContentAction(
  id: string,
  data: Partial<Omit<AiContent, "id" | "createdAt">>,
): Promise<AiContent> {
  const ctx = await getSessionContext()
  return updateAiContentUseCase(ctx, aiContentRepo, id, data)
}

export async function markAsPublishedAction(
  id: string,
  platform: AiContent["publishedTo"],
): Promise<AiContent> {
  if (!platform) {
    // Defensive guard. The chart/form-side dialogs always pass a
    // concrete platform when calling this action; the type stays
    // optional because the `AiContent.publishedTo` field is itself
    // nullable for content not yet published.
    throw new Error("Platform is required to mark content as published")
  }
  const ctx = await getSessionContext()
  return markAiContentPublishedUseCase(ctx, aiContentRepo, id, platform)
}

export async function deleteAiContentAction(id: string): Promise<void> {
  const ctx = await getSessionContext()
  return deleteAiContentUseCase(ctx, aiContentRepo, id)
}

export async function deleteAiContentsByPropertyAction(propertyId: string): Promise<void> {
  const ctx = await getSessionContext()
  return deleteAiContentsByPropertyUseCase(ctx, aiContentRepo, propertyId)
}

// ---------------------------------------------------------------------------
// Hashtag library actions
// ---------------------------------------------------------------------------

export async function getHashtagsAction(): Promise<string[]> {
  const ctx = await getSessionContext()
  return getHashtagsUseCase(ctx, hashtagRepo)
}

export async function addHashtagAction(tag: string): Promise<void> {
  const ctx = await getSessionContext()
  return addHashtagUseCase(ctx, hashtagRepo, tag)
}

export async function removeHashtagAction(tag: string): Promise<void> {
  const ctx = await getSessionContext()
  return removeHashtagUseCase(ctx, hashtagRepo, tag)
}

export async function addHashtagsAction(tags: string[]): Promise<void> {
  const ctx = await getSessionContext()
  return addHashtagsUseCase(ctx, hashtagRepo, tags)
}
