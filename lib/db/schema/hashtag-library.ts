import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core"

/**
 * Per-org curated hashtag library. Each row holds a single tag string
 * stored in canonical `#`-prefixed form (the adapter normalizes input
 * before INSERT — see `DrizzleHashtagRepository`). The
 * `(organization_id, tag) WHERE deleted_at IS NULL` partial UNIQUE
 * constraint anchors the dedup invariant at the DB layer.
 *
 * The partial UNIQUE is NOT expressed here because Drizzle Kit cannot
 * model partial UNIQUE constraints natively — it lives in the SQL
 * migration `drizzle/sql/030_ai_contents_extras_and_hashtag_library.sql`.
 * Mirror of the partial UNIQUE pattern used by `inquiry` and `deal`.
 *
 * Soft-delete audit columns mirror `ai_contents` (R24 / sub-plan):
 * `deleted_at` plus snapshot fields for the actor identity. The
 * snapshot is captured at delete-time so we don't lose the audit
 * trail when the actor account itself is later removed.
 */
export const hashtagLibrary = pgTable(
  "hashtag_library",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),

    tag: text("tag").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: uuid("deleted_by_user_id"),
    deletedByUserName: text("deleted_by_user_name"),
    deletedByUserEmail: text("deleted_by_user_email"),
  },
  (t) => [
    index("hashtag_library_org_id_idx").on(t.organizationId),
    index("hashtag_library_org_tag_idx").on(t.organizationId, t.tag),
  ],
)
