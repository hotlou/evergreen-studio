import { getBrandContext } from "@/lib/brand";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";

export const metadata = { title: "Library · Evergreen Studio" };

export default async function LibraryPage() {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const tabs = [
    { key: "generated", label: "Generated", count: 0 },
    { key: "uploaded", label: "Uploaded", count: 0 },
    { key: "winners", label: "Evergreen Winners", count: 0 },
  ];

  return (
    <div className="px-8 py-7">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          MEDIA · TAGGED · SEARCHABLE
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          Library
        </h1>
        <p className="text-sm text-slate-muted mt-1.5">
          Everything the tool has made, everything you&apos;ve uploaded, and the
          winners mined from your past posts.
        </p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-line">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            disabled
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px ${
              i === 0
                ? "border-evergreen-500 text-evergreen-700 font-semibold"
                : "border-transparent text-slate-muted"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] font-mono">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-evergreen-600 font-bold mb-2">
          M2 · M6
        </div>
        <p className="text-sm text-slate-muted max-w-md mx-auto">
          Ingest-and-mine (M2) seeds the Winners tab from your real post history.
          Upload + auto-tagging for brand guidelines lands in M6.
        </p>
      </div>
    </div>
  );
}
