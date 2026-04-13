"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, Undo2 } from "lucide-react";
import {
  approvePiece,
  unapprovePiece,
  updatePieceBody,
  archivePiece,
} from "@/app/actions/content";
import { cn } from "@/lib/utils";

export type ContentCardPiece = {
  id: string;
  pillarName: string;
  pillarColor: string;
  angleTitle: string;
  body: string;
  reasonWhy: string | null;
  status: string;
};

export function ContentCard({ piece }: { piece: ContentCardPiece }) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(piece.body);
  const [pending, startTransition] = useTransition();

  const isApproved = piece.status === "approved";

  function handleApprove() {
    startTransition(async () => {
      if (isApproved) {
        await unapprovePiece(piece.id);
      } else {
        await approvePiece(piece.id);
      }
    });
  }

  function handleSaveEdit() {
    startTransition(async () => {
      await updatePieceBody(piece.id, editBody);
      setEditing(false);
    });
  }

  function handleArchive() {
    startTransition(async () => {
      await archivePiece(piece.id);
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-white transition",
        isApproved
          ? "border-evergreen-500 shadow-md shadow-evergreen-100"
          : "border-slate-line"
      )}
    >
      {/* Header: pillar chip + angle */}
      <div className="px-5 py-3 border-b border-slate-line flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: piece.pillarColor }}
        >
          {piece.pillarName}
        </span>
        <span className="text-xs text-slate-muted font-mono">
          {piece.angleTitle}
        </span>
        {isApproved && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-evergreen-600 uppercase tracking-wider">
            <Check className="w-3 h-3" /> Approved
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {editing ? (
          <div>
            <textarea
              autoFocus
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={8}
              className="w-full text-[13px] leading-relaxed text-slate-ink border border-slate-line rounded-lg px-3 py-2 outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none font-mono"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setEditBody(piece.body);
                  setEditing(false);
                }}
                className="text-xs text-slate-muted hover:text-slate-ink px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={pending}
                className="text-xs font-semibold bg-evergreen-500 text-white rounded-lg px-3 py-1.5 hover:bg-evergreen-600"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[13px] leading-relaxed text-slate-ink whitespace-pre-wrap">
            {piece.body}
          </div>
        )}
      </div>

      {/* Reason why */}
      {piece.reasonWhy && !editing && (
        <div className="px-5 pb-3">
          <div className="bg-slate-bg rounded-lg px-3 py-2 text-[11px] text-slate-muted leading-relaxed">
            <span className="font-bold uppercase tracking-wider text-[9px]">
              Why this:{" "}
            </span>
            {piece.reasonWhy}
          </div>
        </div>
      )}

      {/* Actions */}
      {!editing && (
        <div className="px-5 py-3 border-t border-slate-line flex items-center gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              isApproved
                ? "bg-evergreen-100 text-evergreen-700 hover:bg-evergreen-200"
                : "bg-evergreen-500 text-white hover:bg-evergreen-600"
            )}
          >
            {isApproved ? (
              <>
                <Undo2 className="w-3 h-3" /> Undo
              </>
            ) : (
              <>
                <Check className="w-3 h-3" /> Approve
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-muted hover:bg-slate-bg transition"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleArchive}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs text-slate-muted hover:text-red-600 transition p-1.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
