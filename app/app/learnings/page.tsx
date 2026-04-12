import { getBrandContext } from "@/lib/brand";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";

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

  return (
    <div className="px-8 py-7">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          FEEDBACK LOOP · COMPOUNDING
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          Learnings
        </h1>
        <p className="text-sm text-slate-muted mt-1.5">
          Every edit, thumbs-down, and regenerate-reason becomes a durable rule
          that steers future generations.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-evergreen-600 font-bold mb-2">
          M5 · BRAND MEMORY LOOP
        </div>
        <p className="text-sm text-slate-muted max-w-md mx-auto">
          Capture starts the moment generation ships in M4 — every edit on a
          Today card becomes a BrandLearning row. This view lists them and lets
          you promote any learning to a permanent rule.
        </p>
      </div>
    </div>
  );
}
