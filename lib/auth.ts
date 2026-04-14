import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
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
