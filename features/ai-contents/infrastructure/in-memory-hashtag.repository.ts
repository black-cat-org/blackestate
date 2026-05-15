import { DEFAULT_HASHTAGS } from "@/lib/constants/ai"
import type { IHashtagRepository } from "@/features/ai-contents/domain/hashtag.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

/**
 * In-memory adapter for `IHashtagRepository`. Process-global state;
 * ignores `ctx` until R38b/R38d. Same caveats as
 * `InMemoryAiContentRepository`: pre-MVP scaffolding, do not depend
 * on this for production. R38d swaps to a Drizzle adapter backed
 * by a `hashtag_library` table with per-org RLS.
 *
 * Tag normalization: `add` and `remove` both `#`-prefix the incoming
 * tag before touching the store, so callers can pass `"foo"` or
 * `"#foo"` interchangeably and the lookup is symmetric. Stored
 * representation is always the prefixed form (single source of truth
 * for the canonical key the future DB table will index on).
 */
export class InMemoryHashtagRepository implements IHashtagRepository {
  private hashtags: string[] = [...DEFAULT_HASHTAGS]

  async findAll(_ctx: SessionContext): Promise<string[]> {
    return [...this.hashtags]
  }

  async add(_ctx: SessionContext, tag: string): Promise<void> {
    const normalized = normalizeTag(tag)
    if (!this.hashtags.includes(normalized)) {
      this.hashtags = [...this.hashtags, normalized]
    }
  }

  async remove(_ctx: SessionContext, tag: string): Promise<void> {
    const normalized = normalizeTag(tag)
    this.hashtags = this.hashtags.filter((h) => h !== normalized)
  }

  async addMany(ctx: SessionContext, tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.add(ctx, tag)
    }
  }
}

function normalizeTag(tag: string): string {
  return tag.startsWith("#") ? tag : `#${tag}`
}
