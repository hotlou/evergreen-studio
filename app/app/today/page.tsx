import Link from "next/link";
import { getBrandContext } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";
import { GenerateButton } from "@/components/today/GenerateButton";
import { ContentCard, type ContentCardPiece } from "@/components/today/ContentCard";

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
    orderBy: { sortOrder: "asc" },
  });

  const hasPillars = pillars.length > 0;
  const totalShare = pillars.reduce((s, p) => s + p.targetShare, 0);
  const onTrack = Math.abs(totalShare - 1.0) <= 0.02;

  // Fetch today's content pieces (generated in the last 24h, not archived)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const pieces = await prisma.contentPiece.findMany({
    where: {
      brandId: brand.id,
      channel: "instagram",
      status: { not: "archived" },
      generatedAt: { gte: todayStart },
    },
    include: {
      pillar: { select: { name: true, color: true } },
      angle: { select: { title: true } },
    },
    orderBy: { generatedAt: "desc" },
  });

  const cardPieces: ContentCardPiece[] = pieces.map((p) => ({
    id: p.id,
    pillarName: p.pillar?.name ?? "General",
    pillarColor: p.pillar?.color ?? "#44546C",
    angleTitle: p.angle?.title ?? "",
    body: p.body,
    reasonWhy: p.reasonWhy,
    status: p.status,
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
      <div className="rounded-xl border border-slate-line bg-white p-4 mb-6">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-2.5">
          <span>PILLAR MIX · TARGET</span>
          {hasPillars && (
            <span className={onTrack ? "text-evergreen-600" : "text-amber-600"}>
              {onTrack ? "● Configured" : "● Shares don't sum to 100%"}
            </span>
          )}
        </div>

        {hasPillars ? (
          <>
            <div className="flex h-2 rounded overflow-hidden bg-slate-bg">
              {pillars.map((p) => {
                const pct = Math.round(p.targetShare * 100);
                if (pct <= 0) return null;
                return (
                  <div
                    key={p.id}
                    style={{ width: `${pct}%`, background: p.color }}
                    className="transition-all duration-300"
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2.5 text-[11px] font-mono text-slate-muted">
              {pillars.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm inline-block"
                    style={{ background: p.color }}
                  />
                  {p.name} {Math.round(p.targetShare * 100)}%
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <Link
              href="/app/strategy"
              className="text-xs text-evergreen-600 font-semibold hover:text-evergreen-700"
            >
              Set up pillars in Strategy →
            </Link>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="mb-6">
        <GenerateButton brandId={brand.id} hasPillars={hasPillars} />
      </div>

      {/* Content cards */}
      {cardPieces.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
              GENERATED · {cardPieces.length} pieces
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
