"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";
import { PillarCard } from "./PillarCard";
import { createPillar, updatePillarShares } from "@/app/actions/strategy";
import { cn } from "@/lib/utils";

type Angle = {
  id: string;
  title: string;
  notes: string | null;
  lastUsedAt: Date | null;
  useCount: number;
};

type Pillar = {
  id: string;
  brandId: string;
  name: string;
  description: string | null;
  targetShare: number;
  color: string;
  angles: Angle[];
};

export function PillarList({
  brandId,
  pillars: initialPillars,
}: {
  brandId: string;
  pillars: Pillar[];
}) {
  const [shares, setShares] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of initialPillars) {
      m[p.id] = Math.round(p.targetShare * 100);
    }
    return m;
  });
  const [newPillarName, setNewPillarName] = useState("");
  const [pending, startTransition] = useTransition();

  // Sync when pillars change from server (new pillar added / deleted)
  const pillars = initialPillars;
  useEffect(() => {
    setShares((prev) => {
      const next: Record<string, number> = {};
      for (const p of initialPillars) {
        next[p.id] = prev[p.id] ?? Math.round(p.targetShare * 100);
      }
      return next;
    });
  }, [initialPillars]);
  const total = Object.values(shares).reduce((s, v) => s + v, 0);
  const balanced = Math.abs(total - 100) <= 1;

  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save when shares sum to 100% (debounced 800ms)
  const autoSave = useCallback(
    (nextShares: Record<string, number>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const t = Object.values(nextShares).reduce((s, v) => s + v, 0);
      if (Math.abs(t - 100) > 1) return;
      if (pillars.length === 0) return;
      saveTimer.current = setTimeout(() => {
        const shareList = pillars.map((p) => ({
          pillarId: p.id,
          targetShare: (nextShares[p.id] ?? 0) / 100,
        }));
        startTransition(() => { updatePillarShares(brandId, shareList); });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 800);
    },
    [pillars, brandId, startTransition]
  );

  function handleShareChange(pillarId: string, pct: number) {
    const next = { ...shares, [pillarId]: Math.max(0, Math.min(100, pct)) };
    setShares(next);
    autoSave(next);
  }

  function saveShares() {
    const shareList = pillars.map((p) => ({
      pillarId: p.id,
      targetShare: (shares[p.id] ?? 0) / 100,
    }));
    startTransition(() => { updatePillarShares(brandId, shareList); });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAddPillar() {
    const name = newPillarName.trim();
    if (!name) return;
    startTransition(async () => {
      await createPillar(brandId, name);
    });
    setNewPillarName("");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
          CONTENT PILLARS · TARGETS MUST SUM TO 100%
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] font-mono font-bold",
              balanced ? "text-evergreen-600" : "text-red-600"
            )}
          >
            {total}%
          </span>
          <button
            type="button"
            onClick={saveShares}
            disabled={!balanced || pending}
            className={cn(
              "rounded-lg text-xs font-semibold px-3 py-1.5 transition",
              saved
                ? "bg-evergreen-100 text-evergreen-700"
                : balanced
                ? "bg-evergreen-500 text-white hover:bg-evergreen-600"
                : "bg-slate-line text-slate-muted cursor-not-allowed"
            )}
          >
            {saved ? "Saved" : pending ? "Saving…" : balanced ? "Save shares" : "Must sum to 100%"}
          </button>
        </div>
      </div>

      {/* Pillar mix bar */}
      {pillars.length > 0 && (
        <div className="flex h-2 rounded overflow-hidden bg-slate-bg mb-2">
          {pillars.map((p) => {
            const pct = shares[p.id] ?? 0;
            if (pct <= 0) return null;
            return (
              <div
                key={p.id}
                style={{ width: `${pct}%`, background: p.color }}
                className="transition-all duration-300"
              />
            );
          })}
        </div>
      )}

      {/* Legend */}
      {pillars.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 text-[11px] font-mono text-slate-muted">
          {pillars.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ background: p.color }}
              />
              {p.name} {shares[p.id] ?? 0}%
            </span>
          ))}
        </div>
      )}

      {/* Pillar cards */}
      <div className="space-y-2.5">
        {pillars.map((p) => (
          <PillarCard
            key={p.id}
            pillar={p}
            sharePercent={shares[p.id] ?? 0}
            onShareChange={(v) => handleShareChange(p.id, v)}
          />
        ))}
      </div>

      {/* Add pillar */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newPillarName}
          onChange={(e) => setNewPillarName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddPillar();
            }
          }}
          placeholder="New pillar name…"
          className="flex-1 rounded-lg border border-dashed border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 bg-transparent placeholder:text-slate-muted"
        />
        <button
          type="button"
          onClick={handleAddPillar}
          disabled={!newPillarName.trim() || pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-4 py-2.5 text-sm font-semibold hover:bg-slate-bg disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Plus className="w-4 h-4" /> Add pillar
        </button>
      </div>
    </div>
  );
}
