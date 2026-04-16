import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { ac, owner, admin, agent } from "./auth-permissions";
import { pool } from "./db/pool";

export const auth = betterAuth({
  database: pool,

  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Auto-create org for new users after sign-up (email) or OAuth callback.
      // Uses auth.api.createOrganization (handles org + member + creatorRole).
      // Then updates the session DB row with activeOrganizationId since the
      // org plugin can't set it without session headers (server-side call).
      //
      // Timing: this hook runs BEFORE the HTTP response is sent (confirmed
      // in Better Auth source: runAfterHooks awaited before toResponse).
      // So the org is committed to DB before the browser redirects to /dashboard.
      // No race condition with ensureOrganization() in the layout.
      if (ctx.path !== "/sign-up/email" && !ctx.path.startsWith("/callback/")) return;

      const newSession = ctx.context.newSession;
      if (!newSession) return;

      try {
        // Guard: skip if user already has an org (idempotent)
        const existing = await pool.query(
          `SELECT id FROM member WHERE "userId" = $1 LIMIT 1`,
          [newSession.user.id]
        );
        if (existing.rows.length > 0) return;

        const slug = newSession.user.email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 30);

        await auth.api.createOrganization({
          body: {
            name: newSession.user.name || slug,
            slug: `${slug}-${Date.now().toString(36)}`,
            metadata: { plan: "free" },
            userId: newSession.user.id,
          },
        });

        // Set activeOrganizationId on the session DB row.
        // Necessary because auth.api.createOrganization without headers
        // cannot update the session (no ctx.context.session available).
        const member = await pool.query(
          `SELECT "organizationId" FROM member WHERE "userId" = $1 LIMIT 1`,
          [newSession.user.id]
        );
        const orgId = member.rows[0]?.organizationId;
        if (orgId) {
          await pool.query(
            `UPDATE session SET "activeOrganizationId" = $1 WHERE id = $2`,
            [orgId, newSession.session.id]
          );
        }
      } catch (err) {
        // Do not rethrow — sign-up must not fail if org creation fails.
        // ensureOrganization() in the dashboard layout is the fallback.
        console.error("[auth] Failed to auto-create org for user", newSession.user.id, err);
      }
    }),
  },

  databaseHooks: {
    session: {
      create: {
        // Only effective for SIGN-IN of existing users (org already in member table).
        // For new sign-ups, the org does not exist yet when this runs —
        // it gets created by hooks.after AFTER the session is already saved.
        // The hooks.after then updates the session row directly.
        before: async (session) => {
          if (session.activeOrganizationId) return { data: session };

          const result = await pool.query(
            `SELECT "organizationId" FROM member WHERE "userId" = $1 LIMIT 1`,
            [session.userId]
          );

          const orgId = result.rows[0]?.organizationId;
          return {
            data: {
              ...session,
              activeOrganizationId: orgId || null,
            },
          };
        },
      },
    },
  },

  plugins: [
    organization({
      ac,
      roles: {
        owner,
        admin,
        agent,
      },
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      membershipLimit: async (_user, org) => {
        const plan = (org?.metadata as Record<string, string>)?.plan;
        if (plan === "enterprise") return 100;
        return 1;
      },
      creatorRole: "owner",
      schema: {
        organization: {
          additionalFields: {
            plan: {
              type: "string",
              required: false,
              defaultValue: "free",
            },
            maxSeats: {
              type: "number",
              required: false,
              defaultValue: 1,
            },
            logoUrl: {
              type: "string",
              required: false,
            },
          },
        },
        member: {
          additionalFields: {
            title: {
              type: "string",
              required: false,
            },
          },
        },
      },
    }),
    nextCookies(), // debe ser el último plugin
  ],
});
