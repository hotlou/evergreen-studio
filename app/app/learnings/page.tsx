import { getBrandContext } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";
import { LearningsManager, type Learning } from "@/components/learnings/LearningsManager";

export const metadata = { title: "Learnings · Evergreen Studio" };

export default async function LearningsPage() {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const brand = ctx.currentBrand;

  const learnings = await prisma.brandLearning.findMany({
    where: { brandId: brand.id },
    orderBy: [{ promotedToRule: "desc" }, { strength: "desc" }, { createdAt: "desc" }],
  });

  const mapped: Learning[] = learnings.map((l) => ({
    id: l.id,
    kind: l.kind,
    text: l.text,
    source: l.source,
    strength: l.strength,
    promotedToRule: l.promotedToRule,
    createdAt: l.createdAt,
  }));

  return (
    <div className="px-8 py-7 max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          {brand.name.toUpperCase()} · FEEDBACK LOOP
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          Learnings
        </h1>
        <p className="text-sm text-slate-muted mt-1.5">
          Every edit teaches the system something. These rules get injected
          into every future generation. Promote a rule to give it extra weight.
        </p>
      </div>

      <LearningsManager brandId={brand.id} learnings={mapped} />
    </div>
  );
}
