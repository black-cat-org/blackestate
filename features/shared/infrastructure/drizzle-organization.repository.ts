import { eq, and, isNull } from "drizzle-orm"
import { organization, member, userActiveOrg } from "@/lib/db/schema"
import type { NewOrganization } from "@/lib/db/schema/organization"
import { withRLS } from "./rls"
import { mapOrgRowToEntity } from "./organization.mapper"
import type { SessionContext } from "@/features/shared/domain/session-context"
import type {
  Organization,
  OrganizationMembership,
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
   * List all organizations the caller belongs to, with their role in each.
   *
   * Runs inside `withRLS` because the `organization_select_member_or_superadmin`
   * and `member_select_same_org_or_superadmin` policies evaluate membership
   * through `is_org_member(id)` — which reads the `member` table by
   * `auth.uid()`, not the JWT's `active_org_id` claim. So filtering by
   * `member.user_id = ctx.userId` correctly returns every org the user
   * belongs to, not just the active one.
   */
  async findAllForUser(ctx: SessionContext): Promise<OrganizationMembership[]> {
    const rows = await withRLS(ctx, (tx) =>
      tx
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
        .where(
          and(
            eq(member.userId, ctx.userId),
            isNull(member.deletedAt),
            isNull(organization.deletedAt),
          ),
        )
        .orderBy(organization.createdAt),
    )

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl ?? undefined,
      plan: row.plan,
      role: row.role,
    }))
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

  /**
   * Upsert the caller's active org. Enforced by the `user_active_org_*_own`
   * policies that restrict `user_id = auth.uid()` — `withRLS` feeds the
   * caller's `sub` claim so the policy passes for the caller's own row and
   * blocks any attempt to mutate another user's active-org pointer.
   */
  async setActiveForUser(ctx: SessionContext, orgId: string): Promise<void> {
    await withRLS(ctx, (tx) =>
      tx
        .insert(userActiveOrg)
        .values({ userId: ctx.userId, organizationId: orgId })
        .onConflictDoUpdate({
          target: userActiveOrg.userId,
          set: { organizationId: orgId, updatedAt: new Date() },
        }),
    )
  }

  /**
   * Probe whether the caller is a live member of `orgId`. Used by the
   * switch-active-org use case to validate the target before flipping
   * `user_active_org`. The `member_select_same_org_or_superadmin` policy
   * allows this read because `is_org_member(organization_id)` reads the
   * `member` table via `auth.uid()` — so cross-org self-membership lookups
   * succeed without needing the JWT to already point at the target org.
   */
  async isMember(ctx: SessionContext, orgId: string): Promise<boolean> {
    const rows = await withRLS(ctx, (tx) =>
      tx
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            eq(member.userId, ctx.userId),
            eq(member.organizationId, orgId),
            isNull(member.deletedAt),
          ),
        )
        .limit(1),
    )
    return rows.length > 0
  }
}
