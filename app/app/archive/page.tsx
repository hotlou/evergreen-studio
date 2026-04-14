import { getBrandContext } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";
import { ArchivedResearchCard } from "@/components/archive/ArchivedResearchCard";
import { ArchivedPieceCard } from "@/components/archive/ArchivedPieceCard";
import { researchResultSchema } from "@/lib/research/prompts";

export const metadata = { title: "Archive · Evergreen Studio" };

// Auto-purge anything older than 30 days when the page loads (opportunistic cleanup)
async function purgeOld(brandId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.contentPiece.deleteMany({
    where: {
      brandId,
      status: "archived",
      generatedAt: { lt: thirtyDaysAgo },
    },
  });
}

export default async function ArchivePage() {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const brand = ctx.currentBrand;

  await purgeOld(brand.id);

  // Archived research (if any)
  let archivedResearch = null;
  if (brand.lastResearchArchive) {
    try {
      archivedResearch = researchResultSchema.parse(brand.lastResearchArchive);
    } catch {
      // invalid — ignore
    }
  }

  // Archived content pieces (non-purged, < 30 days)
  const archivedPieces = await prisma.contentPiece.findMany({
    where: { brandId: brand.id, status: "archived" },
    include: {
      pillar: { select: { name: true, color: true } },
      angle: { select: { title: true } },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  });

  const nothingArchived = !archivedResearch && archivedPieces.length === 0;

  return (
    <div className="px-8 py-7 max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          {brand.name.toUpperCase()} · RECOVERABLE FOR 30 DAYS
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          Archive
        </h1>
        <p className="text-sm text-slate-muted mt-1.5">
          Everything you dismissed or archived. Items auto-purge after 30 days.
        </p>
      </div>

      {nothingArchived && (
        <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-muted max-w-md mx-auto">
            Nothing archived. When you dismiss research or archive a content
            piece, it&apos;ll show up here for 30 days in case you change your mind.
          </p>
        </div>
      )}

      {archivedResearch && (
        <section className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-3">
            DISMISSED RESEARCH
          </div>
          <ArchivedResearchCard
            brandId={brand.id}
            result={archivedResearch}
            archivedAt={brand.lastResearchAt}
          />
        </section>
      )}

      {archivedPieces.length > 0 && (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-3">
            ARCHIVED PIECES · {archivedPieces.length}
          </div>
          <div className="space-y-3">
            {archivedPieces.map((p) => (
              <ArchivedPieceCard
                key={p.id}
                id={p.id}
                pillarName={p.pillar?.name ?? "General"}
                pillarColor={p.pillar?.color ?? "#44546C"}
                angleTitle={p.angle?.title ?? ""}
                body={p.body}
                generatedAt={p.generatedAt}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
