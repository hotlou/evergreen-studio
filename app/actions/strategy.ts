"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

// ── Pillars ─────────────────────────────────────────────────

const PILLAR_COLORS = [
  "#4EB35E", "#44546C", "#B8472E", "#C89545", "#5A8A8F",
  "#7B68AE", "#D4785C", "#3D8B8B", "#A45B8C", "#5B8A3D",
];

export async function createPillar(brandId: string, name: string) {
  await requireBrandAccess(brandId);
  const count = await prisma.contentPillar.count({ where: { brandId } });
  const pillar = await prisma.contentPillar.create({
    data: {
      brandId,
      name,
      color: PILLAR_COLORS[count % PILLAR_COLORS.length],
      sortOrder: count,
      targetShare: 0,
    },
  });
  revalidatePath("/app/strategy");
  return pillar;
}

export async function updatePillar(
  pillarId: string,
  data: { name?: string; description?: string; color?: string; targetShare?: number }
) {
  const pillar = await prisma.contentPillar.findUnique({ where: { id: pillarId } });
  if (!pillar) throw new Error("Pillar not found");
  await requireBrandAccess(pillar.brandId);

  await prisma.contentPillar.update({
    where: { id: pillarId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.targetShare !== undefined && { targetShare: data.targetShare }),
    },
  });
  revalidatePath("/app/strategy");
}

export async function deletePillar(pillarId: string) {
  const pillar = await prisma.contentPillar.findUnique({ where: { id: pillarId } });
  if (!pillar) throw new Error("Pillar not found");
  await requireBrandAccess(pillar.brandId);
  await prisma.contentPillar.delete({ where: { id: pillarId } });
  revalidatePath("/app/strategy");
}

export async function updatePillarShares(
  brandId: string,
  shares: { pillarId: string; targetShare: number }[]
) {
  await requireBrandAccess(brandId);
  const total = shares.reduce((s, x) => s + x.targetShare, 0);
  if (Math.abs(total - 1.0) > 0.02) {
    throw new Error(`Shares must sum to 100% (got ${Math.round(total * 100)}%)`);
  }
  await prisma.$transaction(
    shares.map((s) =>
      prisma.contentPillar.update({
        where: { id: s.pillarId },
        data: { targetShare: s.targetShare },
      })
    )
  );
  revalidatePath("/app/strategy");
}

// ── Angles ──────────────────────────────────────────────────

export async function createAngle(pillarId: string, title: string) {
  const pillar = await prisma.contentPillar.findUnique({ where: { id: pillarId } });
  if (!pillar) throw new Error("Pillar not found");
  await requireBrandAccess(pillar.brandId);
  const angle = await prisma.angle.create({
    data: { pillarId, title },
  });
  revalidatePath("/app/strategy");
  return angle;
}

export async function updateAngle(
  angleId: string,
  data: { title?: string; notes?: string }
) {
  const angle = await prisma.angle.findUnique({
    where: { id: angleId },
    include: { pillar: true },
  });
  if (!angle) throw new Error("Angle not found");
  await requireBrandAccess(angle.pillar.brandId);
  await prisma.angle.update({
    where: { id: angleId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  revalidatePath("/app/strategy");
}

export async function deleteAngle(angleId: string) {
  const angle = await prisma.angle.findUnique({
    where: { id: angleId },
    include: { pillar: true },
  });
  if (!angle) throw new Error("Angle not found");
  await requireBrandAccess(angle.pillar.brandId);
  await prisma.angle.delete({ where: { id: angleId } });
  revalidatePath("/app/strategy");
}

// ── Voice + Taboos ──────────────────────────────────────────

export async function updateVoiceGuide(brandId: string, voiceGuide: string) {
  await requireBrandAccess(brandId);
  await prisma.brand.update({
    where: { id: brandId },
    data: { voiceGuide },
  });
  revalidatePath("/app/strategy");
}

export async function updateTaboos(brandId: string, taboosList: string[]) {
  await requireBrandAccess(brandId);
  const cleaned = taboosList
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  await prisma.brand.update({
    where: { id: brandId },
    data: { taboosList: cleaned },
  });
  revalidatePath("/app/strategy");
}
