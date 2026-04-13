import { getBrandContext } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";
import { PillarList } from "@/components/strategy/PillarList";
import { VoiceGuideEditor } from "@/components/strategy/VoiceGuideEditor";
import { TabooWordsEditor } from "@/components/strategy/TabooWordsEditor";

export const metadata = { title: "Strategy · Evergreen Studio" };

export default async function StrategyPage() {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const brand = ctx.currentBrand;

  const pillars = await prisma.contentPillar.findMany({
    where: { brandId: brand.id },
    include: {
      angles: {
        orderBy: { lastUsedAt: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const pillarData = pillars.map((p) => ({
    id: p.id,
    brandId: p.brandId,
    name: p.name,
    description: p.description,
    targetShare: p.targetShare,
    color: p.color,
    angles: p.angles.map((a) => ({
      id: a.id,
      title: a.title,
      notes: a.notes,
      lastUsedAt: a.lastUsedAt,
      useCount: a.useCount,
    })),
  }));

  return (
    <div className="px-8 py-7 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
            BRAND STRATEGY · {brand.name.toUpperCase()}
          </div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
            Strategy
          </h1>
          <p className="text-sm text-slate-muted mt-1.5">
            Pillars, angles, and voice — the rules every generation obeys
          </p>
        </div>
      </div>

      {/* Pillars + angles */}
      <div className="mb-6">
        <PillarList brandId={brand.id} pillars={pillarData} />
      </div>

      {/* Voice + Taboos side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VoiceGuideEditor
          brandId={brand.id}
          initial={brand.voiceGuide ?? ""}
        />
        <TabooWordsEditor
          brandId={brand.id}
          initial={brand.taboosList}
        />
      </div>
    </div>
  );
}
