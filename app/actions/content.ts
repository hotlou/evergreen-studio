"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rewritePiece, type RewriteInstruction } from "@/lib/generation/rewrite";
import { captureLearningFromEdit } from "@/lib/learnings/capture";

async function requirePieceAccess(pieceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const piece = await prisma.contentPiece.findUnique({
    where: { id: pieceId },
    include: { brand: { include: { workspace: { include: { memberships: true } } } } },
  });
  if (!piece) throw new Error("Piece not found");
  const isMember = piece.brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) throw new Error("Access denied");
  return piece;
}

export async function approvePiece(pieceId: string) {
  await requirePieceAccess(pieceId);
  await prisma.contentPiece.update({
    where: { id: pieceId },
    data: { status: "approved" },
  });
  revalidatePath("/app/today");
}

export async function unapprovePiece(pieceId: string) {
  await requirePieceAccess(pieceId);
  await prisma.contentPiece.update({
    where: { id: pieceId },
    data: { status: "draft" },
  });
  revalidatePath("/app/today");
}

export async function updatePieceBody(pieceId: string, body: string) {
  const piece = await requirePieceAccess(pieceId);
  const originalBody = piece.body;
  await prisma.contentPiece.update({
    where: { id: pieceId },
    data: { body },
  });

  // Fire-and-forget: ask Claude if this edit reveals a brand learning.
  // Intentionally not awaited — edit UX shouldn't wait on it.
  captureLearningFromEdit({
    brandId: piece.brandId,
    originalBody,
    revisedBody: body,
    source: "edit",
  });

  revalidatePath("/app/today");
  revalidatePath("/app/library");
}

export async function archivePiece(pieceId: string) {
  await requirePieceAccess(pieceId);
  await prisma.contentPiece.update({
    where: { id: pieceId },
    data: { status: "archived" },
  });
  revalidatePath("/app/today");
  revalidatePath("/app/library");
}

export async function rewritePieceAction(
  pieceId: string,
  instruction: RewriteInstruction
) {
  await requirePieceAccess(pieceId);
  const result = await rewritePiece(pieceId, instruction);
  revalidatePath("/app/today");
  revalidatePath("/app/library");
  return result;
}
