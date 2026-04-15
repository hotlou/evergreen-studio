import { getBrandContext } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";
import { GenerateButton } from "@/components/today/GenerateButton";
import { ContentCard, type ContentCardPiece } from "@/components/today/ContentCard";
import { PillarMixBar, type PillarMixPillar } from "@/components/today/PillarMixBar";
import { toDisplayPercents } from "@/lib/utils/shares";

export const metadata = { title: "Today · Evergreen Studio" };

export default async function TodayPage() {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const brand = ctx.currentBrand;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const pillars = await prisma.contentPillar.findMany({
    where: { brandId: brand.id },
    include: {
      _count: { select: { angles: true, contentPieces: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const hasPillars = pillars.length > 0;
  const totalShare = pillars.reduce((s, p) => s + p.targetShare, 0);
  const onTrack = Math.abs(totalShare - 1.0) <= 0.02;
  const displayPercents = toDisplayPercents(pillars.map((p) => p.targetShare));

  // Count recent pieces (last 7 days) per pillar for the detail dialog
  const sevenDaysForPillar = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPerPillar = await prisma.contentPiece.groupBy({
    by: ["pillarId"],
    where: {
      brandId: brand.id,
      generatedAt: { gte: sevenDaysForPillar },
      status: { not: "archived" },
    },
    _count: { _all: true },
  });
  const recentMap = new Map<string, number>();
  for (const row of recentPerPillar) {
    if (row.pillarId) recentMap.set(row.pillarId, row._count._all);
  }

  const pillarMixData: PillarMixPillar[] = pillars.map((p, i) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    targetShare: p.targetShare,
    displayPercent: displayPercents[i],
    angleCount: p._count.angles,
    recentPieces: recentMap.get(p.id) ?? 0,
  }));

  // Fetch recent draft/approved pieces (last 7 days) so timezone doesn't hide them
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const pieces = await prisma.contentPiece.findMany({
    where: {
      brandId: brand.id,
      channel: "instagram",
      // Today shows only fresh drafts: not archived, not approved (those moved to Library),
      // and not superseded by a rewrite
      status: "draft",
      supersededById: null,
      generatedAt: { gte: sevenDaysAgo },
    },
    include: {
      pillar: { select: { name: true, color: true } },
      angle: { select: { title: true } },
    },
    orderBy: { generatedAt: "desc" },
  });

  // Load media assets referenced by the pieces we're about to render
  const allAssetIds = Array.from(
    new Set(pieces.flatMap((p) => p.mediaAssetIds ?? []))
  );
  const assetMap = new Map<string, { id: string; url: string; kind: "image" | "doc" | "video"; caption: string | null }>();
  if (allAssetIds.length > 0) {
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: allAssetIds }, brandId: brand.id },
    });
    for (const a of assets) {
      assetMap.set(a.id, {
        id: a.id,
        url: a.url,
        kind: a.kind,
        caption: a.caption,
      });
    }
  }

  const cardPieces: ContentCardPiece[] = pieces.map((p) => ({
    id: p.id,
    pillarName: p.pillar?.name ?? "General",
    pillarColor: p.pillar?.color ?? "#44546C",
    angleTitle: p.angle?.title ?? "",
    body: p.body,
    reasonWhy: p.reasonWhy,
    status: p.status,
    channel: p.channel,
    media: (p.mediaAssetIds ?? [])
      .map((id) => assetMap.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m)),
  }));

  const approvedCount = cardPieces.filter((p) => p.status === "approved").length;

  return (
    <div className="px-8 py-7 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
            {today.toUpperCase()}
          </div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
            Today&apos;s Content Pack
          </h1>
          <p className="text-sm text-slate-muted mt-1.5">
            {brand.name} · Instagram
            {hasPillars
              ? ` · ${pillars.length} pillars configured`
              : " · Set up pillars in Strategy first"}
          </p>
        </div>
      </div>

      {/* Pillar mix bar */}
      <PillarMixBar
        pillars={pillarMixData}
        onTrack={onTrack}
        hasPillars={hasPillars}
      />

      {/* Generate button */}
      <div className="mb-6">
        <GenerateButton brandId={brand.id} hasPillars={hasPillars} />
      </div>

      {/* Content cards */}
      {cardPieces.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
              RECENT PIECES · {cardPieces.length} total · last 7 days
            </div>
            {approvedCount > 0 && (
              <span className="text-[10px] font-mono font-bold text-evergreen-600">
                {approvedCount} approved
              </span>
            )}
          </div>
          <div className="space-y-4">
            {cardPieces.map((piece) => (
              <ContentCard key={piece.id} piece={piece} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no pieces yet */}
      {cardPieces.length === 0 && hasPillars && (
        <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-evergreen-600 font-bold mb-2">
            NO CONTENT YET TODAY
          </div>
          <h2 className="font-display text-xl text-slate-ink mb-2">
            Hit &ldquo;Generate&rdquo; to create today&apos;s pack
          </h2>
          <p className="text-sm text-slate-muted max-w-md mx-auto">
            The AI will pick under-served pillars, select fresh angles, and write
            3 Instagram captions that won&apos;t repeat what you&apos;ve posted before.
          </p>
        </div>
      )}
    </div>
  );
}
