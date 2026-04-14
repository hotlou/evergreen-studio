"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { restorePiece } from "@/app/actions/archive";

export function ArchivedPieceCard({
  id,
  pillarName,
  pillarColor,
  angleTitle,
  body,
  generatedAt,
}: {
  id: string;
  pillarName: string;
  pillarColor: string;
  angleTitle: string;
  body: string;
  generatedAt: Date;
}) {
  const [pending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      await restorePiece(id);
    });
  }

  return (
    <div className="rounded-xl border border-slate-line bg-white">
      <div className="px-5 py-3 border-b border-slate-line flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: pillarColor }}
        >
          {pillarName}
        </span>
        <span className="text-[11px] text-slate-muted">{angleTitle}</span>
        <span className="ml-auto text-[10px] font-mono text-slate-muted">
          Archived · {new Date(generatedAt).toLocaleDateString()}
        </span>
      </div>
      <div className="px-5 py-4 text-[13px] text-slate-ink whitespace-pre-wrap line-clamp-4">
        {body}
      </div>
      <div className="px-5 py-3 border-t border-slate-line">
        <button
          type="button"
          onClick={handleRestore}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-ink hover:bg-slate-bg disabled:opacity-40"
        >
          <RotateCcw className="w-3 h-3" />
          {pending ? "Restoring…" : "Restore to Drafts"}
        </button>
      </div>
    </div>
  );
}
