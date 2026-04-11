import Link from "next/link";
import { Plus } from "lucide-react";

export function EmptyBrandState() {
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-3">
        NO BRAND YET
      </div>
      <h2 className="font-display text-2xl text-slate-ink mb-2">
        Start by describing a brand
      </h2>
      <p className="text-sm text-slate-muted mb-6">
        Everything Evergreen does hangs off the brand brief. It takes five minutes.
      </p>
      <Link
        href="/app/brands/new"
        className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm px-5 py-2.5 transition"
      >
        <Plus className="w-4 h-4" /> New brand
      </Link>
    </div>
  );
}
