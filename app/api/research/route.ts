import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { researchBrand } from "@/lib/research/pipeline";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { brandId, bypassCache } = body as {
    brandId: string;
    bypassCache?: boolean;
  };

  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }

  // Verify access
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { workspace: { include: { memberships: true } } },
  });

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const isMember = brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { result, cached, scraperPaths } = await researchBrand(
      brand,
      bypassCache ?? false
    );

    return NextResponse.json({
      result,
      cached,
      scraperPaths,
    });
  } catch (err) {
    console.error("Research pipeline error:", err);
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
