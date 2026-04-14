"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
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
  /** Keywords that boost a pillar's weight when this preset is applied */
  keywords?: string[];
  /** Or a custom resolver */
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
    // Split budget evenly among unlocked
    const base = Math.floor(budget / unlocked.length);
    unlocked.forEach((p) => (p.pct = base));
    let leftover = budget - base * unlocked.length;
    for (let i = 0; i < leftover && i < unlocked.length; i++) {
      unlocked[i].pct += 1;
    }
  } else {
    // Scale proportionally to budget
    unlocked.forEach((p) => {
      p.pct = round((p.pct / unlockedTotal) * budget);
    });
    // Fix residual
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
  // Fix residual
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
}: {
  pillars: AllocatorPillar[];
  onChange: (next: AllocatorPillar[]) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const total = pillars.reduce((s, p) => s + p.pct, 0);
  const balanced = total === 100;
  const over = total > 100;

  function rebalance(changedIdx: number, next: AllocatorPillar[]): AllocatorPillar[] {
    // After changing one slider, redistribute the diff across other unlocked pillars
    const t = next.reduce((s, p) => s + p.pct, 0);
    const diff = 100 - t;
    if (diff === 0) return next;

    const pool = next
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => !p.locked && i !== changedIdx && p.pct > 0);
    if (pool.length === 0) {
      // fallback: any unlocked except changed
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
    // Round + fix residual
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
    const next = pillars.map((p, i) =>
      i === idx ? { ...p, pct } : { ...p }
    );
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
    if (preset.compute) {
      next = preset.compute(pillars);
    } else if (preset.keywords) {
      next = weightedByKeywords(pillars, preset.keywords);
    } else {
      return;
    }
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
            How often each pillar shows up in your feed
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

      {/* Stacked bar */}
      <div className="flex w-full h-11 rounded-lg overflow-hidden bg-slate-bg select-none">
        {pillars.map((p, i) => {
          if (p.pct <= 0) return null;
          const showLabel = p.pct >= 6;
          return (
            <div
              key={p.id}
              style={{ flex: `${p.pct} 0 0`, background: p.color }}
              title={`${p.name} — ${p.pct}%`}
              className={cn(
                "relative transition-all duration-150 flex items-center justify-center text-white font-semibold text-xs",
                i > 0 && "border-l-2 border-white",
                dragging === p.id && "brightness-110"
              )}
            >
              {showLabel && `${p.pct}%`}
            </div>
          );
        })}
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-2.5 text-xs text-slate-muted">
        {pillars.map((p) => {
          if (p.pct <= 0) return null;
          const short = p.name.length > 34 ? p.name.slice(0, 32) + "…" : p.name;
          return (
            <span key={p.id} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: p.color }}
              />
              {short}
            </span>
          );
        })}
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

      {/* Per-pillar rows */}
      <div className="mt-6 flex flex-col gap-2">
        {pillars.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              "grid grid-cols-[14px_minmax(0,1fr)_minmax(140px,200px)_44px_28px] gap-3 items-center px-3 py-2.5 rounded-lg border transition",
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
              onClick={() => handleLockToggle(i)}
              className={cn(
                "flex items-center justify-center p-1.5 rounded transition",
                p.locked
                  ? "text-slate-ink bg-slate-line hover:bg-slate-300"
                  : "text-slate-muted hover:bg-slate-bg hover:text-slate-ink"
              )}
              title={p.locked ? "Unlock" : "Lock"}
            >
              {p.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
