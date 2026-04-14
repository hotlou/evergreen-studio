"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Trash2, Plus } from "lucide-react";
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

const PILLAR_COLORS = [
  "#4EB35E", "#44546C", "#B8472E", "#C89545", "#5A8A8F",
  "#7B68AE", "#D4785C", "#3D8B8B", "#A45B8C", "#5B8A3D",
];

export function EditPillarDialog({
  pillar,
  open,
  onClose,
}: {
  pillar: Pillar | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PILLAR_COLORS[0]);
  const [newAngle, setNewAngle] = useState("");
  const [pending, startTransition] = useTransition();

  // Sync local state when pillar changes or dialog opens
  useEffect(() => {
    if (pillar) {
      setName(pillar.name);
      setDescription(pillar.description ?? "");
      setColor(pillar.color);
    }
  }, [pillar]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !pillar) return null;

  const dirty =
    name.trim() !== pillar.name ||
    description.trim() !== (pillar.description ?? "") ||
    color !== pillar.color;

  function handleSave() {
    if (!pillar) return;
    startTransition(async () => {
      await updatePillar(pillar.id, {
        name: name.trim(),
        description: description.trim(),
        color,
      });
    });
  }

  function handleDelete() {
    if (!pillar) return;
    if (!confirm(`Delete pillar "${pillar.name}" and all its angles?`)) return;
    startTransition(async () => {
      await deletePillar(pillar.id);
      onClose();
    });
  }

  function handleAddAngle() {
    if (!pillar) return;
    const title = newAngle.trim();
    if (!title) return;
    startTransition(async () => {
      await createAngle(pillar.id, title);
      setNewAngle("");
    });
  }

  function handleDeleteAngle(angleId: string) {
    startTransition(async () => {
      await deleteAngle(angleId);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-ink/40 backdrop-blur-sm anim-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-slate-line flex items-center justify-between"
          style={{ background: `${color}15` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: color }}
            />
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
              Edit pillar
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-muted hover:text-slate-ink p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-line px-3 py-2 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="One-line description of what this pillar covers…"
              className="w-full rounded-lg border border-slate-line px-3 py-2 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PILLAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-lg transition",
                    color === c
                      ? "ring-2 ring-offset-2 ring-evergreen-500"
                      : "hover:scale-110"
                  )}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Angles */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-2">
              Angles · {pillar.angles.length}
            </label>
            <div className="space-y-1.5 mb-2">
              {pillar.angles.length === 0 && (
                <div className="text-xs text-slate-muted italic">
                  No angles yet. Angles are specific topic ideas within this pillar.
                </div>
              )}
              {pillar.angles.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-slate-line bg-slate-bg/40"
                >
                  <span className="flex-1 text-[13px] text-slate-ink truncate">
                    {a.title}
                  </span>
                  {a.useCount > 0 && (
                    <span className="text-[10px] font-mono text-slate-muted">
                      Used {a.useCount}×
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteAngle(a.id)}
                    disabled={pending}
                    className="text-slate-muted hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
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
                placeholder="Add an angle…"
                className="flex-1 rounded border border-dashed border-slate-line px-2.5 py-1.5 text-xs outline-none focus:border-evergreen-500"
              />
              <button
                type="button"
                onClick={handleAddAngle}
                disabled={!newAngle.trim() || pending}
                className="inline-flex items-center gap-1 rounded border border-slate-line px-2.5 py-1.5 text-xs font-semibold text-slate-ink hover:bg-slate-bg disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-line flex items-center justify-between bg-slate-bg/30">
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5 transition"
          >
            <Trash2 className="w-3 h-3" />
            Delete pillar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-muted hover:text-slate-ink px-3 py-1.5"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || pending || !name.trim()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition",
                dirty && name.trim()
                  ? "bg-evergreen-500 text-white hover:bg-evergreen-600"
                  : "bg-slate-line text-slate-muted cursor-not-allowed"
              )}
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
