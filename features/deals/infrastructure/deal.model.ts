import type { deal } from "@/lib/db/schema"

/**
 * Drizzle-inferred row types for the `deal` table. Owned by the
 * feature-infrastructure layer per the convention established by
 * `features/leads/infrastructure/lead.model.ts` and
 * `features/properties/infrastructure/property.model.ts` — the schema
 * file (`lib/db/schema/deal.ts`) describes the DB shape; the feature
 * layer derives its own `Row` / `Insert` aliases from it.
 *
 * These types are consumed by the mapper (R19) and the repository
 * adapter (R20). They are NOT the domain entity (`features/deals/
 * domain/deal.entity.ts`) — the domain version uses `undefined`
 * for nullable fields while the row uses `null`. The mapper bridges
 * the two boundaries.
 */
export type DealRow = typeof deal.$inferSelect
export type DealInsert = typeof deal.$inferInsert
