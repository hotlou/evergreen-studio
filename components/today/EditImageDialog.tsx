"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { RotatingStatusToast } from "./RotatingStatusToast";

export type EditResult = {
  mediaAssetId: string;
  url: string;
  prompt: string;
  modelUsed: string;
};

const QUICK_EDITS = [
  "Move the logo to the top-left corner",
  "Make the background lighter",
  "Add the brand logo to the bottom-right corner",
  "Remove any text overlays",
  "Increase contrast and saturation",
  "Make the overall mood warmer",
];

export function EditImageDialog({
  pieceId,
  sourceImage,
  onClose,
  onEdited,
}: {
  pieceId: string;
  sourceImage: { id: string; url: string };
  onClose: () => void;
  onEdited: (result: EditResult) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runEdit() {
    if (prompt.trim().length < 5) return;
    setError(null);
    setEditing(true);
    try {
      const res = await fetch(`/api/content/${pieceId}/edit-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sourceMediaAssetId: sourceImage.id,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Edit failed" }));
        throw new Error(j.error ?? "Edit failed");
      }
      const data = (await res.json()) as EditResult;
      onEdited(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setEditing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-ink/50 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-line bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-line gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted font-bold">
              IMAGE · EDIT WITH PROMPT
            </div>
            <h2 className="font-display text-lg text-slate-ink mt-0.5">
              Describe what to change
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-muted hover:text-slate-ink p-1 rounded"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={cn(
            "px-5 py-4 space-y-4 transition-opacity",
            editing && "opacity-50 pointer-events-none select-none"
          )}
        >
          {/* Source image preview */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1.5">
              Source image
            </div>
            <div className="rounded-lg border border-slate-line overflow-hidden bg-slate-bg inline-block">
              <Image
                src={sourceImage.url}
                alt="Source image to edit"
                width={320}
                height={320}
                className="max-w-full max-h-[240px] object-contain"
                unoptimized
              />
            </div>
          </div>

          {/* Quick edit pills */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1.5">
              Quick edits
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_EDITS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setPrompt(q)}
                  className={cn(
                    "text-[11px] rounded-full border px-2.5 py-1 transition",
                    prompt === q
                      ? "border-evergreen-500 bg-evergreen-50 text-evergreen-700 font-semibold"
                      : "border-slate-line text-slate-muted hover:bg-slate-bg hover:text-slate-ink"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Edit prompt */}
          <div>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1.5">
                Edit instruction
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to change…"
                rows={3}
                className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-[13px] leading-relaxed text-slate-ink outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-y"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) {
                    e.preventDefault();
                    runEdit();
                  }
                }}
              />
            </label>
            <div className="text-[11px] text-slate-muted mt-1">
              {prompt.length} chars · The original image is sent as a high-fidelity reference
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 text-red-700 text-xs px-3 py-2">
              <span className="font-bold uppercase tracking-wider text-[9px]">
                Error ·{" "}
              </span>
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-line bg-slate-bg/30">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-line text-slate-muted hover:bg-slate-bg text-xs font-semibold px-3 py-2 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={runEdit}
            disabled={editing || prompt.trim().length < 5}
            className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 transition"
          >
            {editing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Editing…
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                Edit image
              </>
            )}
          </button>
        </div>
      </div>

      {editing && <RotatingStatusToast />}
    </div>
  );
}
