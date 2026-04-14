import { auth } from "./auth";
import { headers } from "next/headers";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function ensureOrganization() {
  const session = await getSession();
  if (!session) return null;

  if (session.session.activeOrganizationId) return session;

  const orgs = await auth.api.listOrganizations({
    headers: await headers(),
  });

  if (orgs && orgs.length > 0) {
    await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId: orgs[0].id },
    });
    return await getSession();
  }

  const user = session.user;
  const slug = user.email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);

  await auth.api.createOrganization({
    headers: await headers(),
    body: {
      name: user.name,
      slug: `${slug}-${Date.now().toString(36)}`,
      metadata: { plan: "free" },
    },
  });

  return await getSession();
}
