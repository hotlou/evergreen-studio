"use server";

import { revalidatePath } from "next/cache";
import type { LearningKind } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireLearningAccess(learningId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const learning = await prisma.brandLearning.findUnique({
    where: { id: learningId },
    include: { brand: { include: { workspace: { include: { memberships: true } } } } },
  });
  if (!learning) throw new Error("Learning not found");
  const isMember = learning.brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) throw new Error("Access denied");
  return learning;
}

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

export async function createLearning(
  brandId: string,
  kind: LearningKind,
  text: string
) {
  await requireBrandAccess(brandId);
  await prisma.brandLearning.create({
    data: { brandId, kind, text, source: "manual", strength: 2 },
  });
  revalidatePath("/app/learnings");
}

export async function updateLearning(
  learningId: string,
  data: { text?: string; kind?: LearningKind; promotedToRule?: boolean }
) {
  await requireLearningAccess(learningId);
  await prisma.brandLearning.update({
    where: { id: learningId },
    data,
  });
  revalidatePath("/app/learnings");
}

export async function deleteLearning(learningId: string) {
  await requireLearningAccess(learningId);
  await prisma.brandLearning.delete({ where: { id: learningId } });
  revalidatePath("/app/learnings");
}

export async function promoteLearning(learningId: string) {
  await requireLearningAccess(learningId);
  await prisma.brandLearning.update({
    where: { id: learningId },
    data: { promotedToRule: true, strength: { increment: 2 } },
  });
  revalidatePath("/app/learnings");
}
