"use client";

import { useState, useTransition } from "react";
import { Check, X, Sparkles } from "lucide-react";
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
  onDismiss,
  onAccepted,
}: {
  brandId: string;
  result: ResearchResult;
  hasExistingPillars: boolean;
  onDismiss: () => void;
  onAccepted: () => void;
}) {
  // When no pillars exist → all selected by default
  // When pillars exist → all unchecked (merge mode)
  const [selectedPillars, setSelectedPillars] = useState<Set<number>>(
    () => new Set(hasExistingPillars ? [] : result.pillars.map((_, i) => i))
  );
  const [acceptVoice, setAcceptVoice] = useState(!hasExistingPillars);
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
    };
    startTransition(async () => {
      await acceptResearch(brandId, result, input);
      setSaved(true);
      // Give user a moment to see the success state, then refresh
      setTimeout(() => onAccepted(), 1500);
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
      <div className="rounded-xl border border-evergreen-200 bg-evergreen-50 p-5 text-center">
        <Check className="w-6 h-6 text-evergreen-600 mx-auto mb-2" />
        <div className="font-semibold text-evergreen-700 text-sm">
          Strategy updated
        </div>
        <p className="text-xs text-evergreen-600 mt-1">
          Pillars, angles, voice, and taboos have been saved.
        </p>
      </div>
    );
  }

  const buttonLabel = hasExistingPillars ? "Merge suggestions" : "Accept all";
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
