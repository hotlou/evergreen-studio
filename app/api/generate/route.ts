import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateContentPack,
  MalformedToolInputError,
} from "@/lib/generation/pipeline";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { brandId, channel = "instagram", count = 3 } = body as {
    brandId: string;
    channel?: string;
    count?: number;
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
    const pieces = await generateContentPack(
      brandId,
      channel,
      Math.min(count, 6)
    );
    return NextResponse.json({ pieces });
  } catch (err) {
    console.error("Generation pipeline error:", err);
    // Keep the dev-facing detail in the log above; surface a friendly
    // message for the known cold-cache hiccup so the UI doesn't show
    // raw "Claude returned pieces as a malformed string" wording.
    if (err instanceof MalformedToolInputError) {
      return NextResponse.json(
        {
          error:
            "Generation hiccupped on this brand's first run. Click Generate again — this almost always resolves on retry.",
        },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
