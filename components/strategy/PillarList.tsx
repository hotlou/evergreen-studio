"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";
import { EditPillarDialog } from "./EditPillarDialog";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when pillars change from server
  useEffect(() => {
    setAllocator((prev) => {
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

  function handleAddPillar() {
    const name = newPillarName.trim();
    if (!name) return;
    startTransition(async () => {
      await createPillar(brandId, name);
    });
    setNewPillarName("");
  }

  const editingPillar =
    editingId !== null
      ? initialPillars.find((p) => p.id === editingId) ?? null
      : null;

  return (
    <div className="space-y-4">
      {allocator.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            Content Pillars
          </div>
          <span
            className={cn(
              "text-[10px] font-mono font-bold",
              balanced
                ? saved
                  ? "text-evergreen-600"
                  : "text-slate-muted"
                : "text-amber-600"
            )}
          >
            {!balanced
              ? "● Must sum to 100%"
              : saved
              ? "● Auto-saved"
              : pending
              ? "● Saving…"
              : "● Up to date"}
          </span>
        </div>
      )}

      <PillarMixAllocator
        pillars={allocator}
        onChange={handleAllocatorChange}
        onEditPillar={(id) => setEditingId(id)}
      />

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

      {/* Edit dialog */}
      <EditPillarDialog
        pillar={editingPillar}
        open={editingId !== null}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}
