import { prisma } from "@/lib/db";

type PillarWithAngles = {
  id: string;
  name: string;
  description: string | null;
  targetShare: number;
  color: string;
  angles: {
    id: string;
    title: string;
    notes: string | null;
    lastUsedAt: Date | null;
    useCount: number;
  }[];
};

export type SelectedSlot = {
  pillar: PillarWithAngles;
  angle: {
    id: string;
    title: string;
    notes: string | null;
  };
};

/**
 * Select N pillar+angle slots for generation, biased toward:
 * 1. Under-served pillars (actual 7-day mix vs. targetShare)
 * 2. Stale angles (oldest lastUsedAt or never used)
 *
 * No embeddings needed here — this is the scheduling layer.
 * Semantic dedup happens post-generation in the pipeline.
 */
export async function selectSlots(
  brandId: string,
  channel: string,
  count: number
): Promise<SelectedSlot[]> {
  // Fetch pillars + angles
  const pillars = await prisma.contentPillar.findMany({
    where: { brandId },
    include: {
      angles: { orderBy: { lastUsedAt: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (pillars.length === 0) {
    throw new Error("No pillars configured — set up Strategy first");
  }

  // Count pieces per pillar in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPieces = await prisma.contentPiece.findMany({
    where: {
      brandId,
      channel: channel as never,
      generatedAt: { gte: sevenDaysAgo },
      status: { not: "archived" },
    },
    select: { pillarId: true },
  });

  const actualCounts: Record<string, number> = {};
  for (const p of recentPieces) {
    if (p.pillarId) actualCounts[p.pillarId] = (actualCounts[p.pillarId] ?? 0) + 1;
  }
  const totalRecent = recentPieces.length || 1;

  // Score each pillar: how under-served it is (target - actual mix)
  const pillarScores = pillars.map((p) => {
    const actualShare = (actualCounts[p.id] ?? 0) / totalRecent;
    const deficit = p.targetShare - actualShare; // positive = under-served
    return { pillar: p, deficit };
  });

  // Sort by deficit descending — most under-served first
  pillarScores.sort((a, b) => b.deficit - a.deficit);

  // Select slots: pick top-deficit pillars, then pick their stalest angle
  const slots: SelectedSlot[] = [];
  const usedAngleIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Round-robin through pillars by deficit, wrapping if count > pillars
    const idx = i % pillarScores.length;
    // Prefer under-served, but cycle through all if generating many
    const { pillar } = pillarScores[idx];

    if (pillar.angles.length === 0) continue;

    // Pick the stalest unused angle for this pillar
    const angle = pillar.angles.find((a) => !usedAngleIds.has(a.id))
      ?? pillar.angles[0]; // fallback: reuse least-recent

    usedAngleIds.add(angle.id);

    slots.push({
      pillar: {
        id: pillar.id,
        name: pillar.name,
        description: pillar.description,
        targetShare: pillar.targetShare,
        color: pillar.color,
        angles: pillar.angles.map((a) => ({
          id: a.id,
          title: a.title,
          notes: a.notes,
          lastUsedAt: a.lastUsedAt,
          useCount: a.useCount,
        })),
      },
      angle: { id: angle.id, title: angle.title, notes: angle.notes },
    });
  }

  // If we got fewer slots than requested (pillars with no angles), that's ok
  if (slots.length === 0) {
    throw new Error("No angles configured — add angles to your pillars first");
  }

  return slots;
}
