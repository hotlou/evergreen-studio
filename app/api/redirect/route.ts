import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirectInputSchema, runRedirect } from "@/lib/research/redirect";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { brandId, ...rest } = body as { brandId: string };

  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }

  const parsed = redirectInputSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      workspace: { include: { memberships: true } },
      pillars: { orderBy: { sortOrder: "asc" } },
    },
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
    const result = await runRedirect(
      {
        brandName: brand.name,
        currentVoice: brand.voiceGuide ?? "",
        currentTaboos: brand.taboosList,
        currentPillars: brand.pillars.map((p) => ({
          name: p.name,
          description: p.description,
          targetShare: p.targetShare,
        })),
      },
      parsed.data
    );
    return NextResponse.json({ result });
  } catch (err) {
    console.error("Redirect error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Redirect failed" },
      { status: 500 }
    );
  }
}
