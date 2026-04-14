"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";
import { PillarCard } from "./PillarCard";
import {
  PillarMixAllocator,
  type AllocatorPillar,
} from "./PillarMixAllocator";
import { createPillar, updatePillarShares } from "@/app/actions/strategy";
import { cn } from "@/lib/utils";
import { toDisplayPercents } from "@/lib/utils/shares";

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
  // Map pillars to the allocator shape, seeding locked state from a local key
  const [allocator, setAllocator] = useState<AllocatorPillar[]>(() => {
    const pcts = toDisplayPercents(initialPillars.map((p) => p.targetShare));
    return initialPillars.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      pct: pcts[i],
      locked: false,
    }));
  });
  const [newPillarName, setNewPillarName] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when pillars change from server (new pillar added / deleted / renamed / recolored)
  useEffect(() => {
    setAllocator((prev) => {
      // If any pillar was added or removed, re-seed from server using largest-remainder
      const prevIds = new Set(prev.map((p) => p.id));
      const nextIds = new Set(initialPillars.map((p) => p.id));
      const added = initialPillars.some((p) => !prevIds.has(p.id));
      const removed = prev.some((p) => !nextIds.has(p.id));

      if (added || removed) {
        const pcts = toDisplayPercents(
          initialPillars.map((p) => p.targetShare)
        );
        return initialPillars.map((p, i) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          pct: pcts[i],
          locked: false,
        }));
      }
      // Otherwise only update name/color to reflect server updates, keep user's pct edits
      return initialPillars.map((p) => {
        const prior = prev.find((x) => x.id === p.id);
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          pct: prior?.pct ?? 0,
          locked: prior?.locked ?? false,
        };
      });
    });
  }, [initialPillars]);

  const total = allocator.reduce((s, p) => s + p.pct, 0);
  const balanced = total === 100;

  // Debounced auto-save when shares are balanced
  const autoSave = useCallback(
    (next: AllocatorPillar[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const t = next.reduce((s, p) => s + p.pct, 0);
      if (t !== 100) return;
      if (next.length === 0) return;
      saveTimer.current = setTimeout(() => {
        const shareList = next.map((p) => ({
          pillarId: p.id,
          targetShare: p.pct / 100,
        }));
        startTransition(() => {
          updatePillarShares(brandId, shareList);
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 800);
    },
    [brandId, startTransition]
  );

  function handleAllocatorChange(next: AllocatorPillar[]) {
    setAllocator(next);
    autoSave(next);
  }

  function saveShares() {
    const shareList = allocator.map((p) => ({
      pillarId: p.id,
      targetShare: p.pct / 100,
    }));
    startTransition(() => {
      updatePillarShares(brandId, shareList);
    });
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

  // Map pillar share % back for individual PillarCard display
  const sharesById: Record<string, number> = {};
  for (const a of allocator) sharesById[a.id] = a.pct;

  return (
    <div className="space-y-5">
      {/* Save button bar (only shown when unbalanced) */}
      {allocator.length > 0 && !balanced && (
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            Content Pillars
          </div>
          <button
            type="button"
            onClick={saveShares}
            disabled
            className="rounded-lg text-xs font-semibold px-3 py-1.5 bg-slate-line text-slate-muted cursor-not-allowed"
          >
            Must sum to 100%
          </button>
        </div>
      )}

      {allocator.length > 0 && balanced && (
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            Content Pillars
          </div>
          <span
            className={cn(
              "text-[10px] font-mono font-bold",
              saved ? "text-evergreen-600" : "text-slate-muted"
            )}
          >
            {saved ? "● Auto-saved" : pending ? "● Saving…" : "● Up to date"}
          </span>
        </div>
      )}

      {/* The allocator */}
      <PillarMixAllocator
        pillars={allocator}
        onChange={handleAllocatorChange}
      />

      {/* Pillar cards (angles + description editing) */}
      {initialPillars.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-3">
            Pillar details · angles, descriptions
          </div>
          <div className="space-y-2.5">
            {initialPillars.map((p) => (
              <PillarCard
                key={p.id}
                pillar={p}
                sharePercent={sharesById[p.id] ?? 0}
                onShareChange={(v) => {
                  const next = allocator.map((a) =>
                    a.id === p.id ? { ...a, pct: Math.max(0, Math.min(100, v)) } : a
                  );
                  handleAllocatorChange(next);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add pillar */}
      <div className="flex gap-2">
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
