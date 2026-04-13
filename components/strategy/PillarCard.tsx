"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, X, GripVertical } from "lucide-react";
import {
  updatePillar,
  deletePillar,
  createAngle,
  deleteAngle,
} from "@/app/actions/strategy";
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

export function PillarCard({
  pillar,
  sharePercent,
  onShareChange,
}: {
  pillar: Pillar;
  sharePercent: number;
  onShareChange: (newPercent: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pillar.name);
  const [description, setDescription] = useState(pillar.description ?? "");
  const [newAngle, setNewAngle] = useState("");
  const [pending, startTransition] = useTransition();

  function saveName() {
    if (name.trim() && name !== pillar.name) {
      startTransition(() => updatePillar(pillar.id, { name: name.trim() }));
    }
    setEditing(false);
  }

  function saveDescription() {
    if (description !== (pillar.description ?? "")) {
      startTransition(() =>
        updatePillar(pillar.id, { description: description.trim() || undefined })
      );
    }
  }

  function handleAddAngle() {
    const title = newAngle.trim();
    if (!title) return;
    startTransition(() => createAngle(pillar.id, title));
    setNewAngle("");
  }

  function handleDeleteAngle(angleId: string) {
    startTransition(() => deleteAngle(angleId));
  }

  function handleDeletePillar() {
    if (!confirm(`Delete "${pillar.name}" and all its angles?`)) return;
    startTransition(() => deletePillar(pillar.id));
  }

  function daysSince(date: Date | null): string {
    if (!date) return "never";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "today";
    return `${days}d`;
  }

  return (
    <div className="rounded-xl border border-slate-line bg-white p-4 transition">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: pillar.color }}
          />
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="font-bold text-sm text-slate-ink border-b border-evergreen-500 outline-none bg-transparent flex-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-bold text-sm text-slate-ink hover:text-evergreen-600 text-left truncate"
            >
              {pillar.name}
            </button>
          )}
          {!editing && pillar.description && (
            <span className="text-[11px] text-slate-muted truncate hidden sm:inline">
              {pillar.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              value={sharePercent}
              onChange={(e) => onShareChange(Number(e.target.value))}
              className="w-12 px-1.5 py-1 text-right font-mono text-xs border border-slate-line rounded-md outline-none focus:border-evergreen-500"
            />
            <span className="text-xs text-slate-muted">%</span>
          </div>
          <button
            type="button"
            onClick={handleDeletePillar}
            className="p-1 rounded hover:bg-red-50 text-slate-muted hover:text-red-600 transition"
            title="Delete pillar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description (editable) */}
      <div className="mb-3 pl-5">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Short description…"
          className="w-full text-[11px] text-slate-muted outline-none bg-transparent placeholder:text-slate-line"
        />
      </div>

      {/* Angles */}
      <div className="flex flex-wrap gap-1.5 pl-5">
        {pillar.angles.map((angle) => (
          <span
            key={angle.id}
            className="group inline-flex items-center gap-1.5 bg-slate-bg text-[11px] px-2.5 py-1 rounded-full text-slate-ink"
          >
            {angle.title}
            <span className="font-mono text-slate-muted">
              · {daysSince(angle.lastUsedAt)}
            </span>
            <button
              type="button"
              onClick={() => handleDeleteAngle(angle.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-muted hover:text-red-600 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Add angle inline */}
        <span className="inline-flex items-center border border-dashed border-slate-line rounded-full overflow-hidden">
          <input
            type="text"
            value={newAngle}
            onChange={(e) => setNewAngle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddAngle();
              }
            }}
            placeholder="+ add angle"
            className="text-[11px] px-2.5 py-1 outline-none bg-transparent w-24 placeholder:text-slate-muted"
          />
          {newAngle.trim() && (
            <button
              type="button"
              onClick={handleAddAngle}
              className="px-1.5 text-evergreen-600 hover:text-evergreen-700"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
