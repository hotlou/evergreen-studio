"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ResearchResult } from "@/lib/research/prompts";

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

// ── Accept research results (M2) ────────────────────────────

export type AcceptResearchInput = {
  /** Which pillar indices from the ResearchResult to accept */
  pillarIndices: number[];
  /** Whether to accept the voice guide */
  acceptVoice: boolean;
  /** Whether to accept/merge taboo words (always merge, never replace) */
  acceptTaboos: boolean;
};

export async function acceptResearch(
  brandId: string,
  result: ResearchResult,
  input: AcceptResearchInput
) {
  const brand = await requireBrandAccess(brandId);

  const selectedPillars = input.pillarIndices.map((i) => result.pillars[i]).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    // Create selected pillars + their angles
    const existingPillars = await tx.contentPillar.findMany({
      where: { brandId },
      select: { id: true, targetShare: true },
    });

    for (let i = 0; i < selectedPillars.length; i++) {
      const p = selectedPillars[i];
      const pillar = await tx.contentPillar.create({
        data: {
          brandId,
          name: p.name,
          description: p.description,
          targetShare: p.targetShare, // temporary — normalized below
          color: p.color,
          sortOrder: existingPillars.length + i,
        },
      });

      for (const angleTitle of p.angles) {
        await tx.angle.create({
          data: { pillarId: pillar.id, title: angleTitle },
        });
      }
    }

    // Normalize ALL pillar shares to sum to 1.0
    const allPillars = await tx.contentPillar.findMany({
      where: { brandId },
      select: { id: true, targetShare: true },
    });
    const rawSum = allPillars.reduce((s, p) => s + p.targetShare, 0) || 1;
    for (const p of allPillars) {
      await tx.contentPillar.update({
        where: { id: p.id },
        data: { targetShare: p.targetShare / rawSum },
      });
    }

    // Voice: only overwrite if existing is empty/whitespace
    if (input.acceptVoice && (!brand.voiceGuide || !brand.voiceGuide.trim())) {
      await tx.brand.update({
        where: { id: brandId },
        data: { voiceGuide: result.voiceGuide },
      });
    }

    // Taboos: always merge, never replace
    if (input.acceptTaboos) {
      const existing = new Set(brand.taboosList.map((t) => t.toLowerCase().trim()));
      const merged = [
        ...brand.taboosList,
        ...result.tabooWords
          .map((t) => t.toLowerCase().trim())
          .filter((t) => t && !existing.has(t)),
      ];
      await tx.brand.update({
        where: { id: brandId },
        data: { taboosList: merged },
      });
    }

    // Archive the result and clear active cache so suggestions don't reappear
    await tx.brand.update({
      where: { id: brandId },
      data: {
        lastResearchArchive: brand.lastResearchResult ?? undefined,
        lastResearchResult: Prisma.DbNull,
      },
    });
  });

  revalidatePath("/app/strategy");
  revalidatePath("/app/today");
}

export async function dismissResearch(brandId: string) {
  const brand = await requireBrandAccess(brandId);
  await prisma.brand.update({
    where: { id: brandId },
    data: {
      lastResearchArchive: brand.lastResearchResult ?? undefined,
      lastResearchResult: Prisma.DbNull,
    },
  });
  revalidatePath("/app/strategy");
}

// ── Apply redirect results ──────────────────────────────────

export async function applyRedirectVoice(brandId: string, voiceGuide: string) {
  await requireBrandAccess(brandId);
  await prisma.brand.update({
    where: { id: brandId },
    data: { voiceGuide },
  });
  revalidatePath("/app/strategy");
}

export async function applyRedirectTaboos(brandId: string, tabooWords: string[]) {
  await requireBrandAccess(brandId);
  const cleaned = tabooWords
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  await prisma.brand.update({
    where: { id: brandId },
    data: { taboosList: cleaned },
  });
  revalidatePath("/app/strategy");
}

export async function applyRedirectPillars(
  brandId: string,
  pillars: {
    name: string;
    description: string;
    targetShare: number;
    color: string;
    angles: string[];
  }[],
  mode: "replace" | "append"
) {
  await requireBrandAccess(brandId);
  const shareSum = pillars.reduce((s, p) => s + p.targetShare, 0) || 1;

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      // Delete existing pillars + cascade deletes angles
      await tx.contentPillar.deleteMany({ where: { brandId } });
    }

    const existingCount =
      mode === "append"
        ? await tx.contentPillar.count({ where: { brandId } })
        : 0;

    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      const pillar = await tx.contentPillar.create({
        data: {
          brandId,
          name: p.name,
          description: p.description,
          targetShare: p.targetShare, // normalized below
          color: p.color,
          sortOrder: existingCount + i,
        },
      });

      for (const angleTitle of p.angles) {
        await tx.angle.create({
          data: { pillarId: pillar.id, title: angleTitle },
        });
      }
    }

    // Normalize ALL shares to sum to 1.0
    const allPillars = await tx.contentPillar.findMany({
      where: { brandId },
      select: { id: true, targetShare: true },
    });
    const rawSum = allPillars.reduce((s, p) => s + p.targetShare, 0) || 1;
    for (const p of allPillars) {
      await tx.contentPillar.update({
        where: { id: p.id },
        data: { targetShare: p.targetShare / rawSum },
      });
    }
    void shareSum;
  });

  revalidatePath("/app/strategy");
  revalidatePath("/app/today");
}
