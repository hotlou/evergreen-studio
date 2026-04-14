"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { researchResultSchema, type ResearchResult } from "@/lib/research/prompts";

async function requireBrandAccess(brandId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { workspace: { include: { memberships: true } } },
  });
  if (!brand) throw new Error("Brand not found");
  const isMember = brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) throw new Error("Access denied");
  return brand;
}

/**
 * Restore the archived research back to active suggestions.
 * User goes to /app/strategy and sees them again.
 */
export async function restoreResearch(brandId: string) {
  const brand = await requireBrandAccess(brandId);
  if (!brand.lastResearchArchive) throw new Error("No archived research");

  // Validate before promoting
  let result: ResearchResult;
  try {
    result = researchResultSchema.parse(brand.lastResearchArchive);
  } catch {
    throw new Error("Archived research is no longer valid");
  }

  await prisma.brand.update({
    where: { id: brandId },
    data: {
      lastResearchResult: result as unknown as Prisma.InputJsonValue,
      lastResearchArchive: Prisma.DbNull,
    },
  });
  revalidatePath("/app/strategy");
  revalidatePath("/app/archive");
}

export async function clearResearchArchive(brandId: string) {
  await requireBrandAccess(brandId);
  await prisma.brand.update({
    where: { id: brandId },
    data: { lastResearchArchive: Prisma.DbNull },
  });
  revalidatePath("/app/archive");
}

export async function restorePiece(pieceId: string) {
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

  await prisma.contentPiece.update({
    where: { id: pieceId },
    data: { status: "draft" },
  });
  revalidatePath("/app/archive");
  revalidatePath("/app/library");
  revalidatePath("/app/today");
}
