import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { editImageForPiece } from "@/lib/images/edit";

export const runtime = "nodejs";
export const maxDuration = 180;

const bodySchema = z.object({
  prompt: z.string().min(5).max(4000),
  sourceMediaAssetId: z.string().min(1),
  size: z
    .enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
    .optional(),
  quality: z.enum(["low", "medium", "high", "auto"]).optional(),
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

  const piece = await prisma.contentPiece.findUnique({
    where: { id },
    include: {
      brand: { include: { workspace: { include: { memberships: true } } } },
    },
  });
  if (!piece) {
    return NextResponse.json({ error: "Piece not found" }, { status: 404 });
  }
  const isMember = piece.brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let body;
  try {
    const raw = await req.json().catch(() => ({}));
    body = bodySchema.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const result = await editImageForPiece(id, {
      prompt: body.prompt,
      sourceMediaAssetId: body.sourceMediaAssetId,
      size: body.size,
      quality: body.quality,
    });
    revalidatePath("/app/today");
    revalidatePath("/app/library");
    return NextResponse.json(result);
  } catch (err) {
    console.error("Image edit error:", err);
    const msg = err instanceof Error ? err.message : "Image edit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
