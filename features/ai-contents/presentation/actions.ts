"use server"

import {
  getAiContents,
  getAiContentsByProperty,
  createAiContent,
  updateAiContent,
  markAsPublished,
  deleteAiContent,
  deleteAiContentsByProperty,
} from "@/features/ai-contents/infrastructure/ai-contents.service"
import {
  getHashtags,
  addHashtag,
  removeHashtag,
  addHashtags,
} from "@/features/ai-contents/infrastructure/hashtags.store"
import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"

export async function getAiContentsAction(): Promise<AiContent[]> {
  return getAiContents()
}

export async function getAiContentsByPropertyAction(propertyId: string): Promise<AiContent[]> {
  return getAiContentsByProperty(propertyId)
}

export async function createAiContentAction(
  data: Omit<AiContent, "id" | "createdAt">
): Promise<AiContent> {
  return createAiContent(data)
}

export async function updateAiContentAction(
  id: string,
  data: Partial<Omit<AiContent, "id" | "createdAt">>
): Promise<AiContent> {
  return updateAiContent(id, data)
}

export async function markAsPublishedAction(
  id: string,
  platform: AiContent["publishedTo"]
): Promise<AiContent> {
  return markAsPublished(id, platform)
}

export async function deleteAiContentAction(id: string): Promise<void> {
  return deleteAiContent(id)
}

export async function deleteAiContentsByPropertyAction(propertyId: string): Promise<void> {
  return deleteAiContentsByProperty(propertyId)
}

export async function getHashtagsAction(): Promise<string[]> {
  return Promise.resolve(getHashtags())
}

export async function addHashtagAction(tag: string): Promise<void> {
  addHashtag(tag)
}

export async function removeHashtagAction(tag: string): Promise<void> {
  removeHashtag(tag)
}

export async function addHashtagsAction(tags: string[]): Promise<void> {
  addHashtags(tags)
}
