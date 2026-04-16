"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Pencil,
  Trash2,
  Undo2,
  Wand2,
  ChevronDown,
  ArrowRight,
  ImagePlus,
} from "lucide-react";
import {
  approvePiece,
  unapprovePiece,
  updatePieceBody,
  archivePiece,
  rewritePieceAction,
  setPieceImage,
} from "@/app/actions/content";
import type { RewriteInstruction } from "@/lib/generation/rewrite";
import { cn } from "@/lib/utils";
import { GenerateImageDialog } from "./GenerateImageDialog";
import { EditImageDialog, type EditResult } from "./EditImageDialog";

export type ContentCardMedia = {
  id: string;
  url: string;
  kind: "image" | "doc" | "video";
  caption?: string | null;
};

export type ContentCardPiece = {
  id: string;
  pillarName: string;
  pillarColor: string;
  angleTitle: string;
  body: string;
  reasonWhy: string | null;
  status: string;
  channel: string;
  media?: ContentCardMedia[];
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

export function ContentCard({
  piece,
  context = "today",
}: {
  piece: ContentCardPiece;
  context?: "today" | "library";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(piece.body);
  const [pending, startTransition] = useTransition();
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);

  // Local display state for optimistic UX
  const [displayBody, setDisplayBody] = useState(piece.body);
  const [phase, setPhase] = useState<
    "idle" | "rewriting" | "just-rewritten" | "just-approved"
  >("idle");
  const [rewriteNote, setRewriteNote] = useState<string | null>(null);

  const [media, setMedia] = useState<ContentCardMedia[]>(piece.media ?? []);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectingImage, setSelectingImage] = useState(false);
  const [editingImage, setEditingImage] = useState<{
    id: string;
    url: string;
  } | null>(null);

  const isApproved = piece.status === "approved";
  const channelInfo = CHANNEL_LABELS[piece.channel] ?? {
    name: piece.channel,
    suitable: [],
  };
  const charCount = displayBody.length;

  // After rewrite, fade the green pulse after 2.5s
  useEffect(() => {
    if (phase === "just-rewritten") {
      const t = setTimeout(() => setPhase("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function handleApprove() {
    if (isApproved) {
      startTransition(async () => {
        await unapprovePiece(piece.id);
      });
      return;
    }
    // Optimistic: show "just-approved" state, then refresh so card disappears on Today
    startTransition(async () => {
      await approvePiece(piece.id);
      if (context === "today") {
        setPhase("just-approved");
        // Wait for user to see the confirmation, then refresh
        setTimeout(() => router.refresh(), 1800);
      } else {
        router.refresh();
      }
    });
  }

  function handleSaveEdit() {
    startTransition(async () => {
      await updatePieceBody(piece.id, editBody);
      setDisplayBody(editBody);
      setEditing(false);
    });
  }

  function handleArchive() {
    startTransition(async () => {
      await archivePiece(piece.id);
    });
  }

  async function handleRewrite(instruction: RewriteInstruction) {
    setShowRewriteMenu(false);
    setPhase("rewriting");
    try {
      const result = await rewritePieceAction(piece.id, instruction);
      // Optimistically show new body
      setDisplayBody(result.body);
      setEditBody(result.body);
      setRewriteNote(instruction.replace("_", " "));
      setPhase("just-rewritten");
    } catch (err) {
      console.error(err);
      setPhase("idle");
    }
  }

  // Just-approved confirmation card (replaces the regular card briefly)
  if (phase === "just-approved" && context === "today") {
    return (
      <div className="rounded-xl border border-evergreen-500 bg-evergreen-50 p-6 text-center anim-fade-in">
        <div className="inline-flex items-center gap-2 bg-evergreen-500 text-white rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-3">
          <Check className="w-3.5 h-3.5" /> Approved
        </div>
        <p className="text-sm text-evergreen-800 font-medium mb-3">
          Saved to your Library.
        </p>
        <Link
          href="/app/library?tab=approved"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-evergreen-700 hover:text-evergreen-800 transition"
        >
          View in Library <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-white transition-all duration-500 relative",
        isApproved
          ? "border-evergreen-500 shadow-md shadow-evergreen-100"
          : "border-slate-line",
        phase === "just-rewritten" &&
          "ring-2 ring-evergreen-400 ring-offset-2 anim-rewrite-pulse"
      )}
    >
      {/* Rewrite success banner */}
      {phase === "just-rewritten" && rewriteNote && (
        <div className="absolute -top-2 left-4 right-4 flex justify-center pointer-events-auto z-10">
          <div className="inline-flex items-center gap-1.5 bg-evergreen-500 text-white rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg anim-toast-in">
            <Check className="w-3 h-3" />
            Rewritten ({rewriteNote}) · original moved to{" "}
            <Link
              href="/app/library?tab=drafts"
              className="underline hover:text-evergreen-100"
            >
              Drafts
            </Link>
          </div>
        </div>
      )}

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
          <div className="relative">
            {phase === "rewriting" && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-evergreen-700">
                  <div className="w-3 h-3 border-2 border-evergreen-300 border-t-evergreen-600 rounded-full animate-spin" />
                  Rewriting…
                </div>
              </div>
            )}
            <div
              className={cn(
                "text-[13px] leading-relaxed text-slate-ink whitespace-pre-wrap transition-opacity duration-300",
                phase === "rewriting" && "opacity-30"
              )}
            >
              {displayBody}
            </div>
          </div>
        )}
      </div>

      {/* Media gallery — click an image to select; if multiple, "Use this image" commits */}
      {!editing && media.length > 0 && (
        <div className="px-5 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {media
              .filter((m) => m.kind === "image")
              .map((m) => {
                const isSelected = selectedImageId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setSelectedImageId((cur) => (cur === m.id ? null : m.id))
                    }
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition relative text-left",
                      isSelected
                        ? "border-evergreen-500 ring-2 ring-evergreen-100"
                        : "border-slate-line hover:border-evergreen-300"
                    )}
                    title={
                      isSelected
                        ? "Selected"
                        : "Click to select as the image for this post"
                    }
                  >
                    <Image
                      src={m.url}
                      alt={m.caption ?? "Generated image"}
                      width={240}
                      height={240}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-evergreen-500 text-white rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <div
                      className="absolute bottom-1 right-1 flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity"
                      style={{ opacity: isSelected ? 1 : undefined }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingImage({ id: m.id, url: m.url });
                        }}
                        className="bg-white/85 hover:bg-white text-slate-muted hover:text-evergreen-600 text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shadow-sm"
                      >
                        Edit
                      </button>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/85 hover:bg-white text-slate-muted hover:text-slate-ink text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shadow-sm"
                      >
                        Open
                      </a>
                    </div>
                  </button>
                );
              })}
          </div>

          {media.filter((m) => m.kind === "image").length > 1 && (
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-muted">
                {selectedImageId
                  ? "One selected. Use it to hide the rest from this post."
                  : "Click an image to choose which one this post uses."}
              </span>
              {selectedImageId && (
                <button
                  type="button"
                  disabled={selectingImage}
                  onClick={async () => {
                    if (!selectedImageId) return;
                    setSelectingImage(true);
                    try {
                      await setPieceImage(piece.id, selectedImageId);
                      setMedia((m) =>
                        m.filter((x) => x.id === selectedImageId)
                      );
                      setSelectedImageId(null);
                      router.refresh();
                    } finally {
                      setSelectingImage(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-60 text-white font-semibold text-[11px] px-3 py-1.5 transition"
                >
                  <Check className="w-3 h-3" />
                  {selectingImage ? "Saving…" : "Use this image"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image generation error — always shown when present, not gated on media */}
      {!editing && imageError && (
        <div className="px-5 pb-3">
          <div className="rounded-lg border border-red-100 bg-red-50 text-red-700 text-[11px] leading-relaxed px-3 py-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold uppercase tracking-wider text-[9px] mb-0.5">
                Image generation failed
              </div>
              <div className="whitespace-pre-wrap break-words">{imageError}</div>
            </div>
            <button
              type="button"
              onClick={() => setImageError(null)}
              className="text-red-600 hover:text-red-800 shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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

          <button
            type="button"
            onClick={() => {
              setImageError(null);
              setImageDialogOpen(true);
            }}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-muted hover:bg-slate-bg transition disabled:opacity-40"
            title="Prepare and generate image with OpenAI"
          >
            <ImagePlus className="w-3 h-3" />
            {media.length > 0 ? "Generate another" : "Generate image"}
          </button>

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

      {imageDialogOpen && (
        <GenerateImageDialog
          pieceId={piece.id}
          onClose={() => setImageDialogOpen(false)}
          onGenerated={(result) => {
            setMedia((m) => [
              ...m,
              { id: result.mediaAssetId, url: result.url, kind: "image" },
            ]);
            router.refresh();
          }}
        />
      )}

      {editingImage && (
        <EditImageDialog
          pieceId={piece.id}
          sourceImage={editingImage}
          onClose={() => setEditingImage(null)}
          onEdited={(result: EditResult) => {
            setMedia((m) => [
              ...m,
              { id: result.mediaAssetId, url: result.url, kind: "image" },
            ]);
            setEditingImage(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
