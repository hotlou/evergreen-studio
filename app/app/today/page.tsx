import { getBrandContext } from "@/lib/brand";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";

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

  return (
    <div className="px-8 py-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
            {today.toUpperCase()}
          </div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
            Today&apos;s Content Pack
          </h1>
          <p className="text-sm text-slate-muted mt-1.5">
            {brand.name} · Instagram · v1 is wiring up the generation pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="rounded-lg border border-slate-line bg-white text-slate-muted text-xs font-semibold px-4 py-2.5 cursor-not-allowed"
          >
            Regenerate all
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg bg-evergreen-500 text-white text-xs font-semibold px-4 py-2.5 opacity-60 cursor-not-allowed"
          >
            Send approved →
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-line bg-white p-4 mb-6">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-2.5">
          <span>PILLAR MIX · THIS WEEK VS TARGET</span>
          <span className="text-slate-muted">● Pending M3 data</span>
        </div>
        <div className="flex h-2 rounded overflow-hidden bg-slate-bg">
          <div className="w-1/2 bg-slate-line" />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-evergreen-600 font-bold mb-2">
          M4 · DAILY CONTENT PACK
        </div>
        <h2 className="font-display text-2xl text-slate-ink mb-2">
          The generation pipeline lands here
        </h2>
        <p className="text-sm text-slate-muted max-w-md mx-auto">
          M1 is the brand-memory foundation: auth, workspace, intake, and schema.
          M2 brings ingest-and-mine, M3 brings the Strategy editor, and M4 drops
          the first real daily pack into this view.
        </p>
      </div>
    </div>
  );
}
