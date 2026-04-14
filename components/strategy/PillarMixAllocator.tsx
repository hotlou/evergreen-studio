"use client";

import { useState } from "react";
import { Lock, Unlock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export type AllocatorPillar = {
  id: string;
  name: string;
  color: string;
  pct: number; // 0-100 integer
  locked: boolean;
};

type Preset = {
  key: string;
  label: string;
  keywords?: string[];
  compute?: (pillars: AllocatorPillar[]) => AllocatorPillar[];
};

const round = (n: number) => Math.round(n);

function normalizeTo100(pillars: AllocatorPillar[]): AllocatorPillar[] {
  const next = pillars.map((p) => ({ ...p }));
  const locked = next.filter((p) => p.locked);
  const unlocked = next.filter((p) => !p.locked);
  const lockedTotal = locked.reduce((s, p) => s + p.pct, 0);
  const budget = Math.max(0, 100 - lockedTotal);
  const unlockedTotal = unlocked.reduce((s, p) => s + p.pct, 0);

  if (unlocked.length === 0) return next;

  if (unlockedTotal === 0) {
    const base = Math.floor(budget / unlocked.length);
    unlocked.forEach((p) => (p.pct = base));
    let leftover = budget - base * unlocked.length;
    for (let i = 0; i < leftover && i < unlocked.length; i++) {
      unlocked[i].pct += 1;
    }
  } else {
    unlocked.forEach((p) => {
      p.pct = round((p.pct / unlockedTotal) * budget);
    });
    let residual = budget - unlocked.reduce((s, p) => s + p.pct, 0);
    let i = 0;
    while (residual !== 0 && i < unlocked.length * 2) {
      const idx = i % unlocked.length;
      if (unlocked[idx].pct + Math.sign(residual) >= 0) {
        unlocked[idx].pct += Math.sign(residual);
        residual -= Math.sign(residual);
      }
      i++;
    }
  }
  return next;
}

function weightedByKeywords(
  pillars: AllocatorPillar[],
  keywords: string[]
): AllocatorPillar[] {
  const scores = pillars.map((p) => {
    const name = p.name.toLowerCase();
    let s = 1;
    keywords.forEach((k) => {
      if (name.includes(k.toLowerCase())) s += 3;
    });
    return s;
  });
  const total = scores.reduce((a, b) => a + b, 0) || 1;
  const next = pillars.map((p, i) => ({
    ...p,
    locked: false,
    pct: round((scores[i] / total) * 100),
  }));
  let residual = 100 - next.reduce((s, p) => s + p.pct, 0);
  let i = 0;
  while (residual !== 0 && i < next.length * 2) {
    const idx = i % next.length;
    if (next[idx].pct + Math.sign(residual) >= 0) {
      next[idx].pct += Math.sign(residual);
      residual -= Math.sign(residual);
    }
    i++;
  }
  return next;
}

const PRESETS: Preset[] = [
  {
    key: "even",
    label: "Even split",
    compute: (pillars) => {
      const n = pillars.length;
      if (n === 0) return pillars;
      const base = Math.floor(100 / n);
      const next = pillars.map((p) => ({ ...p, locked: false, pct: base }));
      let remainder = 100 - base * n;
      for (let i = 0; i < remainder; i++) next[i].pct += 1;
      return next;
    },
  },
  {
    key: "product",
    label: "Product-heavy",
    keywords: ["product", "truth", "ingredient", "fact", "science", "testing"],
  },
  {
    key: "founder",
    label: "Founder-led",
    keywords: ["founder", "community", "ugc", "behind", "story"],
  },
  {
    key: "comedy",
    label: "Comedy-heavy",
    keywords: ["comedy", "personality", "culture", "anti", "roast", "meme"],
  },
  {
    key: "normalize",
    label: "Normalize to 100",
    compute: (pillars) => normalizeTo100(pillars),
  },
];

export function PillarMixAllocator({
  pillars,
  onChange,
  onEditPillar,
}: {
  pillars: AllocatorPillar[];
  onChange: (next: AllocatorPillar[]) => void;
  onEditPillar?: (pillarId: string) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoveredSeg, setHoveredSeg] = useState<string | null>(null);
  const total = pillars.reduce((s, p) => s + p.pct, 0);
  const balanced = total === 100;
  const over = total > 100;

  function rebalance(changedIdx: number, next: AllocatorPillar[]): AllocatorPillar[] {
    const t = next.reduce((s, p) => s + p.pct, 0);
    const diff = 100 - t;
    if (diff === 0) return next;

    const pool = next
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => !p.locked && i !== changedIdx && p.pct > 0);
    if (pool.length === 0) {
      const fb = next
        .map((p, i) => ({ p, i }))
        .filter(({ p, i }) => !p.locked && i !== changedIdx);
      if (fb.length === 0) return next;
      const share = diff / fb.length;
      fb.forEach(({ p }) => (p.pct = Math.max(0, p.pct + share)));
    } else {
      const poolTotal = pool.reduce((s, { p }) => s + p.pct, 0);
      pool.forEach(({ p }) => {
        const share = (p.pct / poolTotal) * diff;
        p.pct = Math.max(0, p.pct + share);
      });
    }
    next.forEach((p) => (p.pct = round(p.pct)));
    let residual = 100 - next.reduce((s, p) => s + p.pct, 0);
    const candidates = next
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => !p.locked && i !== changedIdx);
    if (residual !== 0 && candidates.length > 0) {
      candidates[0].p.pct = Math.max(0, candidates[0].p.pct + residual);
    }
    return next;
  }

  function handleSliderChange(idx: number, value: number) {
    const pct = Math.max(0, Math.min(100, value));
    const next = pillars.map((p, i) => (i === idx ? { ...p, pct } : { ...p }));
    const rebalanced = rebalance(idx, next);
    onChange(rebalanced);
  }

  function handleLockToggle(idx: number) {
    const next = pillars.map((p, i) =>
      i === idx ? { ...p, locked: !p.locked } : p
    );
    onChange(next);
  }

  function applyPreset(preset: Preset) {
    let next: AllocatorPillar[];
    if (preset.compute) next = preset.compute(pillars);
    else if (preset.keywords) next = weightedByKeywords(pillars, preset.keywords);
    else return;
    onChange(next);
  }

  if (pillars.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-line bg-white p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted font-bold">
            Content mix
          </div>
          <div className="text-sm text-slate-muted mt-0.5">
            Hover a segment to see details · click the eye to edit
          </div>
        </div>
        <div
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-lg",
            balanced
              ? "bg-evergreen-50 text-evergreen-700"
              : over
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-800"
          )}
        >
          {balanced
            ? "100% allocated"
            : over
            ? `${total}% · ${total - 100}% over`
            : `${total}% · ${100 - total}% to allocate`}
        </div>
      </div>

      {/* Stacked bar with tooltip + click-to-edit */}
      <div className="relative">
        <div className="flex w-full h-11 rounded-lg overflow-hidden bg-slate-bg select-none">
          {pillars.map((p, i) => {
            if (p.pct <= 0) return null;
            const showPctLabel = p.pct >= 6;
            const showEye = p.pct >= 4;
            return (
              <div
                key={p.id}
                style={{ flex: `${p.pct} 0 0`, background: p.color }}
                onMouseEnter={() => setHoveredSeg(p.id)}
                onMouseLeave={() => setHoveredSeg((v) => (v === p.id ? null : v))}
                className={cn(
                  "group relative transition-all duration-150 flex items-center justify-center text-white font-semibold text-xs cursor-pointer",
                  i > 0 && "border-l-2 border-white",
                  dragging === p.id && "brightness-110",
                  hoveredSeg === p.id && "brightness-110"
                )}
                onClick={() => onEditPillar?.(p.id)}
              >
                {showPctLabel && `${p.pct}%`}
                {showEye && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPillar?.(p.id);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/25 hover:bg-white/40 rounded p-0.5"
                    title={`Edit ${p.name}`}
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                )}

                {/* Tooltip */}
                {hoveredSeg === p.id && (
                  <div
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                    style={{ minWidth: "max-content" }}
                  >
                    <div className="bg-slate-ink text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{ background: p.color }}
                        />
                        <span className="font-semibold">{p.name}</span>
                        <span className="font-mono opacity-70">{p.pct}%</span>
                      </div>
                    </div>
                    <div
                      className="w-2 h-2 bg-slate-ink absolute left-1/2 -translate-x-1/2 -top-1 rotate-45"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Presets */}
      <div className="flex gap-2 mt-5 flex-wrap items-center">
        <span className="text-xs text-slate-muted mr-1">Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => applyPreset(preset)}
            className="inline-flex items-center rounded-lg border border-slate-line px-2.5 py-1 text-[11px] font-semibold text-slate-ink hover:bg-slate-bg hover:border-evergreen-300 transition"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Per-pillar slider rows */}
      <div className="mt-6 flex flex-col gap-2">
        {pillars.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              "grid grid-cols-[14px_minmax(0,1fr)_minmax(140px,220px)_44px_28px_28px] gap-3 items-center px-3 py-2.5 rounded-lg border transition",
              p.locked
                ? "bg-slate-bg border-slate-line"
                : "bg-white border-slate-line"
            )}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: p.color }}
            />
            <div
              className="text-[13px] font-medium text-slate-ink truncate"
              title={p.name}
            >
              {p.name}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={p.pct}
              disabled={p.locked}
              onMouseDown={() => setDragging(p.id)}
              onMouseUp={() => setDragging(null)}
              onTouchStart={() => setDragging(p.id)}
              onTouchEnd={() => setDragging(null)}
              onChange={(e) => handleSliderChange(i, parseInt(e.target.value))}
              className={cn(
                "w-full accent-evergreen-500",
                p.locked && "opacity-50 cursor-not-allowed"
              )}
            />
            <div className="text-right text-[13px] font-semibold tabular-nums text-slate-ink">
              {p.pct}%
            </div>
            <button
              type="button"
              onClick={() => onEditPillar?.(p.id)}
              className="flex items-center justify-center p-1.5 rounded text-slate-muted hover:bg-slate-bg hover:text-slate-ink transition"
              title="Edit pillar"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleLockToggle(i)}
              className={cn(
                "flex items-center justify-center p-1.5 rounded transition",
                p.locked
                  ? "text-slate-ink bg-slate-line hover:bg-slate-300"
                  : "text-slate-muted hover:bg-slate-bg hover:text-slate-ink"
              )}
              title={p.locked ? "Unlock" : "Lock"}
            >
              {p.locked ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
