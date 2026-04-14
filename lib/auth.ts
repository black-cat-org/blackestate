import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { ac, owner, admin, agent } from "./auth-permissions";
import { pool } from "./db/pool";

export const auth = betterAuth({
  database: pool,

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  databaseHooks: {
    session: {
      create: {
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
