"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import type { ResearchResult } from "@/lib/research/prompts";
import { restoreResearch, clearResearchArchive } from "@/app/actions/archive";

export function ArchivedResearchCard({
  brandId,
  result,
  archivedAt,
}: {
  brandId: string;
  result: ResearchResult;
  archivedAt: Date | null;
}) {
  const [pending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      await restoreResearch(brandId);
    });
  }

  function handleClear() {
    if (!confirm("Delete this archived research permanently?")) return;
    startTransition(async () => {
      await clearResearchArchive(brandId);
    });
  }

  return (
    <div className="rounded-xl border border-slate-line bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-line bg-slate-bg/40 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            ARCHIVED RESEARCH
          </div>
          <div className="text-xs text-slate-muted mt-0.5">
            {archivedAt
              ? `Dismissed ${new Date(archivedAt).toLocaleDateString()}`
              : "Previously dismissed"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 text-white text-xs font-semibold px-3 py-1.5 hover:bg-evergreen-600 disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
            {pending ? "Restoring…" : "Restore"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={pending}
            className="p-1.5 text-slate-muted hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete permanently"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 text-[13px] text-slate-ink">
        <p className="mb-3">{result.summary}</p>
        <div className="flex flex-wrap gap-2">
          {result.pillars.map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: p.color }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
