"use client";

import { useState, useTransition } from "react";
import { Plus, Star, Trash2, Pencil, Check, X } from "lucide-react";
import type { LearningKind, LearningSource } from "@prisma/client";
import {
  createLearning,
  updateLearning,
  deleteLearning,
  promoteLearning,
} from "@/app/actions/learnings";
import { cn } from "@/lib/utils";

export type Learning = {
  id: string;
  kind: LearningKind;
  text: string;
  source: LearningSource;
  strength: number;
  promotedToRule: boolean;
  createdAt: Date;
};

const KIND_META: Record<LearningKind, { label: string; color: string }> = {
  do_this: { label: "Do this", color: "bg-evergreen-100 text-evergreen-800" },
  dont: { label: "Don't", color: "bg-red-50 text-red-700" },
  tone: { label: "Tone", color: "bg-blue-50 text-blue-700" },
  visual: { label: "Visual", color: "bg-amber-50 text-amber-800" },
};

const SOURCE_META: Record<LearningSource, string> = {
  edit: "From an edit",
  thumbs: "From rejection",
  manual: "Manual",
};

export function LearningsManager({
  brandId,
  learnings,
}: {
  brandId: string;
  learnings: Learning[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newKind, setNewKind] = useState<LearningKind>("do_this");
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    const text = newText.trim();
    if (!text) return;
    startTransition(async () => {
      await createLearning(brandId, newKind, text);
      setNewText("");
      setShowAdd(false);
    });
  }

  function handleSaveEdit(id: string) {
    startTransition(async () => {
      await updateLearning(id, { text: editText.trim() });
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLearning(id);
    });
  }

  function handlePromote(id: string) {
    startTransition(async () => {
      await promoteLearning(id);
    });
  }

  // Group by kind for display
  const grouped = learnings.reduce<Record<LearningKind, Learning[]>>(
    (acc, l) => {
      if (!acc[l.kind]) acc[l.kind] = [];
      acc[l.kind].push(l);
      return acc;
    },
    {} as Record<LearningKind, Learning[]>
  );

  return (
    <div>
      {/* Add button */}
      <div className="mb-5 flex items-center justify-between">
        <div className="text-xs text-slate-muted">
          {learnings.length > 0
            ? `${learnings.length} learnings · injected into every generation`
            : "No learnings captured yet"}
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-ink hover:bg-slate-bg transition"
        >
          <Plus className="w-3 h-3" /> Add manually
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-5 rounded-xl border border-evergreen-200 bg-evergreen-50 p-4">
          <div className="flex gap-2 mb-2">
            {(Object.keys(KIND_META) as LearningKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setNewKind(k)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition",
                  newKind === k
                    ? KIND_META[k].color
                    : "bg-white text-slate-muted border border-slate-line"
                )}
              >
                {KIND_META[k].label}
              </button>
            ))}
          </div>
          <textarea
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            placeholder="e.g. 'Lead with a question', 'Never use the word synergy'"
            className="w-full text-sm border border-slate-line rounded-lg px-3 py-2 outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setNewText("");
              }}
              className="text-xs text-slate-muted hover:text-slate-ink px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newText.trim() || pending}
              className="text-xs font-semibold bg-evergreen-500 text-white rounded-lg px-3 py-1.5 hover:bg-evergreen-600 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Add learning"}
            </button>
          </div>
        </div>
      )}

      {/* Learnings by kind */}
      {learnings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-muted max-w-md mx-auto">
            Edit any generated piece and this page starts filling up. Claude
            watches for patterns and captures useful rules automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {(Object.keys(KIND_META) as LearningKind[]).map((kind) => {
            const items = grouped[kind];
            if (!items || items.length === 0) return null;
            return (
              <section key={kind}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      KIND_META[kind].color
                    )}
                  >
                    {KIND_META[kind].label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-muted">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((l) => {
                    const isEditing = editingId === l.id;
                    return (
                      <div
                        key={l.id}
                        className={cn(
                          "rounded-lg border bg-white p-3 flex items-start gap-3",
                          l.promotedToRule
                            ? "border-evergreen-500 shadow-sm"
                            : "border-slate-line"
                        )}
                      >
                        <div className="flex-1">
                          {isEditing ? (
                            <textarea
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              className="w-full text-sm border border-slate-line rounded px-2 py-1 outline-none focus:border-evergreen-500 resize-none"
                            />
                          ) : (
                            <div className="text-[13px] text-slate-ink leading-relaxed">
                              {l.text}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-slate-muted">
                            <span>{SOURCE_META[l.source]}</span>
                            <span>Strength: {l.strength}</span>
                            {l.promotedToRule && (
                              <span className="text-evergreen-600 font-bold uppercase">
                                ● Promoted rule
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(l.id)}
                                disabled={pending}
                                className="p-1.5 text-evergreen-600 hover:bg-evergreen-50 rounded"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-slate-muted hover:bg-slate-bg rounded"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {!l.promotedToRule && (
                                <button
                                  type="button"
                                  onClick={() => handlePromote(l.id)}
                                  disabled={pending}
                                  className="p-1.5 text-slate-muted hover:text-evergreen-600 hover:bg-evergreen-50 rounded"
                                  title="Promote to permanent rule"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditText(l.text);
                                  setEditingId(l.id);
                                }}
                                className="p-1.5 text-slate-muted hover:text-slate-ink hover:bg-slate-bg rounded"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(l.id)}
                                disabled={pending}
                                className="p-1.5 text-slate-muted hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
