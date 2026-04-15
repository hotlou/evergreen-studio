"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X, ArrowRight } from "lucide-react";

export type PillarMixPillar = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  targetShare: number;
  displayPercent: number;
  angleCount: number;
  recentPieces: number;
};

export function PillarMixBar({
  pillars,
  onTrack,
  hasPillars,
}: {
  pillars: PillarMixPillar[];
  onTrack: boolean;
  hasPillars: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-slate-line bg-white p-4 mb-6">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-2.5">
          <span>PILLAR MIX · TARGET</span>
          <div className="flex items-center gap-3">
            {hasPillars && (
              <span className={onTrack ? "text-evergreen-600" : "text-amber-600"}>
                {onTrack ? "● Configured" : "● Shares don't sum to 100%"}
              </span>
            )}
            {hasPillars && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1 text-slate-muted hover:text-evergreen-700 transition"
                title="Pillar mix details"
                aria-label="Show pillar mix details"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="normal-case tracking-normal text-[11px] font-semibold">
                  Details
                </span>
              </button>
            )}
          </div>
        </div>

        {hasPillars ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="block w-full group"
              aria-label="Open pillar mix details"
            >
              <div className="flex h-2 rounded overflow-hidden bg-slate-bg group-hover:h-2.5 transition-all duration-200">
                {pillars.map((p) => {
                  if (p.displayPercent <= 0) return null;
                  return (
                    <div
                      key={p.id}
                      style={{ width: `${p.displayPercent}%`, background: p.color }}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </div>
            </button>
            <div className="flex flex-wrap gap-3 mt-2.5 text-[11px] font-mono text-slate-muted">
              {pillars.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm inline-block"
                    style={{ background: p.color }}
                  />
                  {p.name} {p.displayPercent}%
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <Link
              href="/app/strategy"
              className="text-xs text-evergreen-600 font-semibold hover:text-evergreen-700"
            >
              Set up pillars in Strategy →
            </Link>
          </div>
        )}
      </div>

      {open && (
        <PillarMixDialog pillars={pillars} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function PillarMixDialog({
  pillars,
  onClose,
}: {
  pillars: PillarMixPillar[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-ink/40 backdrop-blur-sm px-4 py-10 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-line bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-line">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted font-bold">
              PILLAR MIX · DETAIL
            </div>
            <h2 className="font-display text-lg text-slate-ink mt-0.5">
              How today&apos;s content is balanced
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-muted hover:text-slate-ink p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex h-2 rounded overflow-hidden bg-slate-bg mb-5">
            {pillars.map((p) => {
              if (p.displayPercent <= 0) return null;
              return (
                <div
                  key={p.id}
                  style={{ width: `${p.displayPercent}%`, background: p.color }}
                />
              );
            })}
          </div>

          <div className="space-y-3">
            {pillars.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-slate-line px-3 py-2.5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ background: p.color }}
                    />
                    <span className="font-semibold text-sm text-slate-ink">
                      {p.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-ink tabular-nums">
                    {p.displayPercent}%
                  </span>
                </div>
                {p.description && (
                  <p className="text-[12px] text-slate-muted leading-relaxed mb-1.5">
                    {p.description}
                  </p>
                )}
                <div className="flex gap-3 text-[10px] font-mono uppercase tracking-wider text-slate-muted">
                  <span>
                    {p.angleCount} angle{p.angleCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {p.recentPieces} piece{p.recentPieces === 1 ? "" : "s"} (7d)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-line">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-muted hover:text-slate-ink px-3 py-2"
          >
            Close
          </button>
          <Link
            href="/app/strategy"
            className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-xs px-3 py-2 transition"
          >
            Edit in Strategy <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
