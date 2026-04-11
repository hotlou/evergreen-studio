import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Brand, Workspace } from "@prisma/client";

const BRAND_COOKIE = "eg_brand_id";

export type BrandContext = {
  user: { id: string; email: string | null; name: string | null };
  workspace: Workspace;
  brands: Brand[];
  currentBrand: Brand | null;
};

/**
 * Server-side brand context for any authed page. Resolves:
 *   user → primary workspace → all brands → currently-selected brand (via cookie,
 *   falling back to first brand in the list).
 *
 * Pages in /app should always call this to avoid drifting on which brand is "current."
 */
export async function getBrandContext(): Promise<BrandContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  const brands = await prisma.brand.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  const cookieStore = await cookies();
  const cookieBrandId = cookieStore.get(BRAND_COOKIE)?.value;
  const currentBrand =
    brands.find((b) => b.id === cookieBrandId) ?? brands[0] ?? null;

  return {
    user: { id: user.id, email: user.email, name: user.name },
    workspace: membership.workspace,
    brands,
    currentBrand,
  };
}

export const BRAND_COOKIE_NAME = BRAND_COOKIE;
