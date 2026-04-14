import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { Pool } from "pg";
import { ac, owner, admin, agent } from "./auth-permissions";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

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
      if (!ctx.path.startsWith("/sign-up")) return;

      const newSession = ctx.context.newSession;
      if (!newSession) return;

      const user = newSession.user;

      const slug = user.email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 30);

      await auth.api.createOrganization({
        body: {
          name: `${user.name}`,
          slug: `${slug}-${Date.now().toString(36)}`,
          userId: user.id,
          metadata: { plan: "free" },
        },
      });
    }),
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
