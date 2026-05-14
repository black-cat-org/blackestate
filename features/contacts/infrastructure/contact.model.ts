import type { contact } from "@/lib/db/schema"

/**
 * Drizzle-inferred row types for the `contact` table. Owned by the
 * feature-infrastructure layer per the convention established by
 * `features/leads/infrastructure/lead.model.ts` and
 * `features/properties/infrastructure/property.model.ts` — the schema
 * file (`lib/db/schema/contact.ts`) describes the DB shape; the feature
 * layer derives its own `Row` / `Insert` aliases from it.
 *
 * These types are consumed by the mapper (R16) and the repository
 * adapter (R17). They are NOT the domain entity (`features/contacts/
 * domain/contact.entity.ts`) — the domain version uses `undefined`
 * for nullable fields while the row uses `null`. The mapper bridges
 * the two boundaries.
 */
export type ContactRow = typeof contact.$inferSelect
export type ContactInsert = typeof contact.$inferInsert
