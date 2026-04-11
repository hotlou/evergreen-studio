import { getBrandContext } from "@/lib/brand";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";

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

  return (
    <div className="px-8 py-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
            BRAND STRATEGY · DRAFT
          </div>
          <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
            Strategy
          </h1>
          <p className="text-sm text-slate-muted mt-1.5">
            Pillars, angles, and voice — the rules every generation obeys
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-slate-line bg-white p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-3">
            VOICE GUIDE
          </div>
          <div className="text-[13px] leading-relaxed text-slate-ink whitespace-pre-wrap">
            {brand.voiceGuide || (
              <span className="text-slate-muted italic">
                No voice guide yet. Edit the brand to add one.
              </span>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-line bg-white p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-3">
            TABOO WORDS · NEVER GENERATE
          </div>
          {brand.taboosList.length ? (
            <div className="flex flex-wrap gap-1.5">
              {brand.taboosList.map((t) => (
                <span
                  key={t}
                  className="bg-red-50 text-red-700 border border-red-100 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                >
                  {t} ✕
                </span>
              ))}
            </div>
          ) : (
            <div className="text-slate-muted text-xs italic">None configured.</div>
          )}
        </section>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-12 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-evergreen-600 font-bold mb-2">
          M3 · PILLARS &amp; ANGLES EDITOR
        </div>
        <p className="text-sm text-slate-muted max-w-md mx-auto">
          Editable pillars (with target % shares that sum to 100) and angles
          with last-used tracking land in M3 — pre-populated by the M2 ingest.
        </p>
      </div>
    </div>
  );
}
