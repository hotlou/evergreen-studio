"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import type { ResearchResult } from "@/lib/research/prompts";
import {
  acceptResearch,
  dismissResearch,
  type AcceptResearchInput,
} from "@/app/actions/strategy";
import { cn } from "@/lib/utils";

export function ResearchResults({
  brandId,
  result,
  hasExistingPillars,
  initialMergeMode = "add",
  onDismiss,
  onAccepted,
}: {
  brandId: string;
  result: ResearchResult;
  hasExistingPillars: boolean;
  initialMergeMode?: "add" | "replace";
  onDismiss: () => void;
  onAccepted: () => void;
}) {
  // Selection defaults:
  // - No existing pillars → all selected
  // - Add mode → none selected (let user pick additions)
  // - Replace mode → all selected (user chose to start fresh)
  const defaultSelected = !hasExistingPillars || initialMergeMode === "replace";
  const [selectedPillars, setSelectedPillars] = useState<Set<number>>(
    () =>
      new Set(defaultSelected ? result.pillars.map((_, i) => i) : [])
  );
  const [acceptVoice, setAcceptVoice] = useState(
    !hasExistingPillars || initialMergeMode === "replace"
  );
  const [acceptTaboos, setAcceptTaboos] = useState(true);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function togglePillar(i: number) {
    setSelectedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleAccept() {
    const input: AcceptResearchInput = {
      pillarIndices: Array.from(selectedPillars).sort(),
      acceptVoice,
      acceptTaboos,
      mergeMode: initialMergeMode,
    };
    startTransition(async () => {
      await acceptResearch(brandId, result, input);
      setSaved(true);
      // Don't auto-dismiss on first onboarding — let the user click the
      // CTA to go generate content. onAccepted() refreshes the page and
      // unmounts this component, which is what we want on subsequent runs.
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissResearch(brandId);
      onDismiss();
    });
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-evergreen-200 bg-evergreen-50 p-6 text-center anim-yellow-fade">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-evergreen-500 text-white mx-auto mb-3">
          <Check className="w-5 h-5" />
        </div>
        <div className="font-display text-lg text-slate-ink mb-1">
          Strategy approved
        </div>
        <p className="text-sm text-slate-muted mb-5">
          Pillars, angles, voice, and taboos are saved. Ready for daily
          content.
        </p>
        <Link
          href="/app/today"
          className="inline-flex items-center gap-2 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm px-5 py-2.5 transition"
        >
          Generate your first content pack
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="mt-4">
          <button
            type="button"
            onClick={onAccepted}
            className="text-xs text-slate-muted hover:text-slate-ink"
          >
            Stay on strategy
          </button>
        </div>
      </div>
    );
  }

  const buttonLabel = hasExistingPillars
    ? "Approve selected"
    : "Approve pillars";
  const nothingSelected =
    selectedPillars.size === 0 && !acceptVoice && !acceptTaboos;

  return (
    <div className="rounded-xl border border-slate-line bg-white shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-line bg-slate-bg/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-evergreen-600" />
          <span className="font-semibold text-sm text-slate-ink">
            AI Research Results
          </span>
          {hasExistingPillars && initialMergeMode === "replace" && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 rounded-full px-2 py-0.5">
              Replace mode
            </span>
          )}
          {hasExistingPillars && initialMergeMode === "add" && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-evergreen-50 text-evergreen-700 rounded-full px-2 py-0.5">
              Add mode
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className="text-slate-muted hover:text-slate-ink p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Review nudge */}
      {!hasExistingPillars && (
        <div className="px-5 py-3 border-b border-slate-line bg-amber-50 anim-yellow-fade">
          <p className="text-[13px] text-slate-ink">
            <span className="font-semibold">
              If these pillars look good, approve them below.
            </span>{" "}
            <span className="text-slate-muted">
              Unchecking a pillar drops it; click a pillar to edit it after
              approving.
            </span>
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="px-5 py-4 border-b border-slate-line">
        <div className="font-mono text-[9px] uppercase tracking-wider text-slate-muted font-bold mb-1.5">
          Brand Analysis
        </div>
        <p className="text-[13px] text-slate-ink leading-relaxed">
          {result.summary}
        </p>
        {result.targetAudience && (
          <p className="text-xs text-slate-muted mt-2">
            <span className="font-semibold">Target audience:</span>{" "}
            {result.targetAudience}
          </p>
        )}
      </div>

      {/* Pillars */}
      <div className="px-5 py-4 border-b border-slate-line">
        <div className="font-mono text-[9px] uppercase tracking-wider text-slate-muted font-bold mb-3">
          PROPOSED PILLARS
          {hasExistingPillars && (
            <span className="ml-2 normal-case tracking-normal font-normal">
              (select which to merge)
            </span>
          )}
        </div>
        <div className="space-y-2">
          {result.pillars.map((p, i) => {
            const selected = selectedPillars.has(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => togglePillar(i)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition",
                  selected
                    ? "border-evergreen-500 bg-evergreen-50"
                    : "border-slate-line hover:bg-slate-bg"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: p.color }}
                  />
                  <span className="font-semibold text-sm text-slate-ink">
                    {p.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-muted">
                    {Math.round(p.targetShare * 100)}%
                  </span>
                  <div className="ml-auto">
                    {selected ? (
                      <Check className="w-4 h-4 text-evergreen-600" />
                    ) : (
                      <div className="w-4 h-4 rounded border border-slate-line" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-muted mb-1.5 pl-5">
                  {p.description}
                </p>
                <div className="flex flex-wrap gap-1 pl-5">
                  {p.angles.map((a) => (
                    <span
                      key={a}
                      className="text-[10px] bg-slate-bg px-2 py-0.5 rounded-full text-slate-muted"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice + Taboos */}
      <div className="px-5 py-4 border-b border-slate-line grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptVoice}
              onChange={(e) => setAcceptVoice(e.target.checked)}
              className="rounded border-slate-line text-evergreen-500 focus:ring-evergreen-500"
            />
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-muted font-bold">
              Voice Guide
            </span>
            {hasExistingPillars && (
              <span className="text-[9px] text-slate-muted normal-case tracking-normal font-normal">
                (only if current is empty)
              </span>
            )}
          </label>
          <p className="text-[12px] text-slate-ink leading-relaxed pl-6">
            {result.voiceGuide}
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTaboos}
              onChange={(e) => setAcceptTaboos(e.target.checked)}
              className="rounded border-slate-line text-evergreen-500 focus:ring-evergreen-500"
            />
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-muted font-bold">
              Taboo Words
            </span>
            <span className="text-[9px] text-slate-muted normal-case tracking-normal font-normal">
              (merges with existing)
            </span>
          </label>
          <div className="flex flex-wrap gap-1 pl-6">
            {result.tabooWords.map((t) => (
              <span
                key={t}
                className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className="text-sm text-slate-muted hover:text-slate-ink"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={nothingSelected || pending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition",
            nothingSelected || pending
              ? "bg-slate-line text-slate-muted cursor-not-allowed"
              : "bg-evergreen-500 text-white hover:bg-evergreen-600"
          )}
        >
          {pending ? "Saving…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}
