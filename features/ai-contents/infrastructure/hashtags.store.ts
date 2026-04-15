import { DEFAULT_HASHTAGS } from "@/lib/constants/ai"

let hashtags: string[] = [...DEFAULT_HASHTAGS]

export function getHashtags(): string[] {
  return [...hashtags]
}

export function addHashtag(tag: string): void {
  const normalized = tag.startsWith("#") ? tag : `#${tag}`
  if (!hashtags.includes(normalized)) {
    hashtags = [...hashtags, normalized]
  }
}

export function removeHashtag(tag: string): void {
  hashtags = hashtags.filter((h) => h !== tag)
}

export function addHashtags(tags: string[]): void {
  for (const tag of tags) {
    addHashtag(tag)
  }
}
