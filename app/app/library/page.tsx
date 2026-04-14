import Link from "next/link";
import { getBrandContext } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";
import { ContentCard, type ContentCardPiece } from "@/components/today/ContentCard";

export const metadata = { title: "Library · Evergreen Studio" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const brand = ctx.currentBrand;
  const params = await searchParams;
  const activeTab = params.tab ?? "approved";

  // Count by status for tab badges
  const [approvedCount, draftCount, archivedCount] = await Promise.all([
    prisma.contentPiece.count({
      where: { brandId: brand.id, status: "approved" },
    }),
    prisma.contentPiece.count({
      where: { brandId: brand.id, status: "draft" },
    }),
    prisma.contentPiece.count({
      where: { brandId: brand.id, status: "archived" },
    }),
  ]);

  const statusFilter =
    activeTab === "approved"
      ? "approved"
      : activeTab === "drafts"
      ? "draft"
      : activeTab === "archived"
      ? "archived"
      : "approved";

  const pieces = await prisma.contentPiece.findMany({
    where: { brandId: brand.id, status: statusFilter },
    include: {
      pillar: { select: { name: true, color: true } },
      angle: { select: { title: true } },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  });

  const cardPieces: ContentCardPiece[] = pieces.map((p) => ({
    id: p.id,
    pillarName: p.pillar?.name ?? "General",
    pillarColor: p.pillar?.color ?? "#44546C",
    angleTitle: p.angle?.title ?? "",
    body: p.body,
    reasonWhy: p.reasonWhy,
    status: p.status,
    channel: p.channel,
  }));

  const tabs = [
    { key: "approved", label: "Approved", count: approvedCount },
    { key: "drafts", label: "Drafts", count: draftCount },
    { key: "archived", label: "Archived", count: archivedCount },
  ];

  return (
    <div className="px-8 py-7 max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          {brand.name.toUpperCase()} · LIBRARY
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          Library
        </h1>
        <p className="text-sm text-slate-muted mt-1.5">
          Everything you&apos;ve approved, drafts in progress, and the archive.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-line">
        {tabs.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <Link
              key={t.key}
              href={`/app/library?tab=${t.key}`}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition ${
                isActive
                  ? "border-evergreen-500 text-evergreen-700 font-semibold"
                  : "border-transparent text-slate-muted hover:text-slate-ink"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] font-mono">{t.count}</span>
            </Link>
          );
        })}
      </div>

      {cardPieces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-muted max-w-md mx-auto">
            {activeTab === "approved" &&
              "No approved pieces yet. Approve content from the Today page to collect your library of winners."}
            {activeTab === "drafts" &&
              "No drafts. Generate some on the Today page."}
            {activeTab === "archived" &&
              "Nothing archived yet. Archived pieces stay here for recovery."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cardPieces.map((piece) => (
            <ContentCard key={piece.id} piece={piece} />
          ))}
        </div>
      )}
    </div>
  );
}
