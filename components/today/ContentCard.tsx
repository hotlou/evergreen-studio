"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, Undo2, Wand2, ChevronDown } from "lucide-react";
import {
  approvePiece,
  unapprovePiece,
  updatePieceBody,
  archivePiece,
  rewritePieceAction,
} from "@/app/actions/content";
import type { RewriteInstruction } from "@/lib/generation/rewrite";
import { cn } from "@/lib/utils";

export type ContentCardPiece = {
  id: string;
  pillarName: string;
  pillarColor: string;
  angleTitle: string;
  body: string;
  reasonWhy: string | null;
  status: string;
  channel: string;
};

const REWRITE_OPTIONS: { label: string; instruction: RewriteInstruction }[] = [
  { label: "Shorten ~50%", instruction: "shorten" },
  { label: "One-line it", instruction: "one_line" },
  { label: "Make punchier", instruction: "punchier" },
  { label: "Expand ~50%", instruction: "expand" },
  { label: "Double length", instruction: "double_it" },
];

const CHANNEL_LABELS: Record<string, { name: string; suitable: string[] }> = {
  instagram: { name: "Instagram", suitable: ["Facebook", "Threads"] },
  tiktok: { name: "TikTok", suitable: ["Reels", "Shorts"] },
  linkedin: { name: "LinkedIn", suitable: [] },
  x: { name: "X", suitable: ["Threads"] },
  facebook: { name: "Facebook", suitable: ["Instagram"] },
  threads: { name: "Threads", suitable: ["Instagram", "X"] },
};

export function ContentCard({ piece }: { piece: ContentCardPiece }) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(piece.body);
  const [pending, startTransition] = useTransition();
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);

  const isApproved = piece.status === "approved";
  const channelInfo = CHANNEL_LABELS[piece.channel] ?? {
    name: piece.channel,
    suitable: [],
  };
  const charCount = piece.body.length;

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

  function handleRewrite(instruction: RewriteInstruction) {
    setShowRewriteMenu(false);
    startTransition(async () => {
      await rewritePieceAction(piece.id, instruction);
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
      {/* Header: pillar chip + angle + channel meta */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-line">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: piece.pillarColor }}
          >
            {piece.pillarName}
          </span>
          <span className="text-[11px] text-slate-muted">
            {piece.angleTitle}
          </span>
          {isApproved && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-evergreen-600 uppercase tracking-wider">
              <Check className="w-3 h-3" /> Approved
            </span>
          )}
        </div>

        {/* Channel info */}
        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-muted">
          <span>
            <span className="uppercase tracking-wider font-bold">For:</span>{" "}
            {channelInfo.name}
          </span>
          {channelInfo.suitable.length > 0 && (
            <span>
              <span className="uppercase tracking-wider font-bold">
                Also works on:
              </span>{" "}
              {channelInfo.suitable.join(", ")}
            </span>
          )}
          <span className="ml-auto">{charCount} chars</span>
        </div>
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
        <div className="px-5 py-3 border-t border-slate-line flex items-center gap-2 relative">
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRewriteMenu((v) => !v)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-muted hover:bg-slate-bg transition"
            >
              <Wand2 className="w-3 h-3" /> Rewrite
              <ChevronDown className="w-3 h-3" />
            </button>

            {showRewriteMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowRewriteMenu(false)}
                />
                <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-line rounded-lg shadow-lg z-20 min-w-[160px] overflow-hidden">
                  {REWRITE_OPTIONS.map((opt) => (
                    <button
                      key={opt.instruction}
                      type="button"
                      onClick={() => handleRewrite(opt.instruction)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-ink hover:bg-evergreen-50 transition"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex-1" />

          {pending && (
            <span className="text-[10px] text-slate-muted font-mono">
              Working…
            </span>
          )}

          <button
            type="button"
            onClick={handleArchive}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs text-slate-muted hover:text-red-600 transition p-1.5"
            title="Archive"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
