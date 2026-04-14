import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImageForPiece } from "@/lib/images/generate";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;

  const piece = await prisma.contentPiece.findUnique({
    where: { id },
    include: { brand: { include: { workspace: { include: { memberships: true } } } } },
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

  try {
    const result = await generateImageForPiece(id);
    revalidatePath("/app/today");
    revalidatePath("/app/library");
    return NextResponse.json(result);
  } catch (err) {
    console.error("Image generation error:", err);
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
