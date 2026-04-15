import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImageForPiece } from "@/lib/images/generate";
import {
  imageSettingsSchema,
  prepareImageGeneration,
} from "@/lib/images/prepare";

export const runtime = "nodejs";
export const maxDuration = 180;

async function requireAccess(pieceId: string, userId: string) {
  const piece = await prisma.contentPiece.findUnique({
    where: { id: pieceId },
    include: { brand: { include: { workspace: { include: { memberships: true } } } } },
  });
  if (!piece) return { error: "Piece not found" as const, status: 404 };
  const isMember = piece.brand.workspace.memberships.some(
    (m) => m.userId === userId
  );
  if (!isMember) return { error: "Access denied" as const, status: 403 };
  return { piece };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await context.params;
  const access = await requireAccess(id, session.user.id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  try {
    const prep = await prepareImageGeneration(id);
    return NextResponse.json(prep);
  } catch (err) {
    console.error("Image prep error:", err);
    const msg = err instanceof Error ? err.message : "Prep failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const postBodySchema = z.object({
  prompt: z.string().min(10).max(8000),
  referenceAssetIds: z.array(z.string()).max(8).default([]),
  includeLogo: z.boolean().default(false),
  settings: imageSettingsSchema.partial().default({}),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const access = await requireAccess(id, session.user.id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured on this deployment. Add it under Vercel → Settings → Environment Variables and redeploy.",
      },
      { status: 500 }
    );
  }

  let body;
  try {
    const raw = await req.json().catch(() => ({}));
    body = postBodySchema.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const result = await generateImageForPiece(id, {
      prompt: body.prompt,
      referenceAssetIds: body.referenceAssetIds,
      includeLogo: body.includeLogo,
      settings: body.settings,
    });
    revalidatePath("/app/today");
    revalidatePath("/app/library");
    return NextResponse.json(result);
  } catch (err) {
    console.error("Image generation error:", err);
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
