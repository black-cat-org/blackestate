import { eq, and, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { organization, member, userActiveOrg } from "@/lib/db/schema"
import type { NewOrganization } from "@/lib/db/schema/organization"
import { withRLS } from "./rls"
import { mapOrgRowToEntity } from "./organization.mapper"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  Organization,
  OrganizationMembership,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from "@/features/shared/domain/organization.entity"
import type { IOrganizationRepository } from "@/features/shared/domain/organization.repository"

export class DrizzleOrganizationRepository implements IOrganizationRepository {
  async findById(ctx: SessionContext, id: string): Promise<Organization | undefined> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select()
        .from(organization)
        .where(and(eq(organization.id, id), isNull(organization.deletedAt)))
        .limit(1),
    )
    return rows[0] ? mapOrgRowToEntity(rows[0]) : undefined
  }

  /**
   * List all organizations the user belongs to, with their role in each.
   *
   * Uses `db` directly (postgres role with BYPASSRLS) because this is a
   * cross-org query: the user's JWT only has one `active_org_id`, but they
   * may belong to multiple orgs. RLS policies scope SELECT to the active
   * org, which would hide the other memberships.
   */
  async findAllForUser(userId: string): Promise<OrganizationMembership[]> {
    const rows = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logoUrl,
        plan: organization.plan,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(and(eq(member.userId, userId), isNull(member.deletedAt), isNull(organization.deletedAt)))
      .orderBy(organization.createdAt)

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl ?? undefined,
      plan: row.plan,
      role: row.role,
    }))
  }

  /**
   * Create org + member(owner) + set active in a single transaction.
   *
   * Uses `db` directly — the new org has no RLS context yet (no member
   * exists for it until this transaction creates one).
   */
  async create(userId: string, data: CreateOrganizationDTO): Promise<Organization> {
    const [row] = await db.transaction(async (tx) => {
      const [newOrg] = await tx
        .insert(organization)
        .values({
          name: data.name,
          slug: data.slug,
          plan: "free",
          maxSeats: 1,
        })
        .returning()

      await tx.insert(member).values({
        userId,
        organizationId: newOrg.id,
        role: "owner",
      })

      await tx
        .insert(userActiveOrg)
        .values({ userId, organizationId: newOrg.id })
        .onConflictDoUpdate({
          target: userActiveOrg.userId,
          set: { organizationId: newOrg.id, updatedAt: new Date() },
        })

      return [newOrg]
    })

    return mapOrgRowToEntity(row)
  }

  async update(
    ctx: SessionContext,
    id: string,
    patch: UpdateOrganizationDTO,
  ): Promise<Organization> {
    const set: Partial<NewOrganization> = {}
    if (patch.name !== undefined) set.name = patch.name
    if (patch.logoUrl !== undefined) set.logoUrl = patch.logoUrl ?? null

    if (Object.keys(set).length === 0) {
      const existing = await this.findById(ctx, id)
      if (!existing) throw new Error("Organization not found")
      return existing
    }

    const rows = await withRLS(ctx, (tx) =>
      tx.update(organization).set(set).where(eq(organization.id, id)).returning(),
    )

    if (rows.length === 0) throw new Error("Organization not found or forbidden")
    return mapOrgRowToEntity(rows[0])
  }

  async setActiveForUser(userId: string, orgId: string): Promise<void> {
    await db
      .insert(userActiveOrg)
      .values({ userId, organizationId: orgId })
      .onConflictDoUpdate({
        target: userActiveOrg.userId,
        set: { organizationId: orgId, updatedAt: new Date() },
      })
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const rows = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1)
    return rows.length > 0
  }

  async isMember(userId: string, orgId: string): Promise<boolean> {
    const rows = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.userId, userId),
          eq(member.organizationId, orgId),
          isNull(member.deletedAt),
        ),
      )
      .limit(1)
    return rows.length > 0
  }
}
