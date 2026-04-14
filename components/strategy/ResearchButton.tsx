"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RotateCcw, X } from "lucide-react";
import type { ResearchResult } from "@/lib/research/prompts";
import { ResearchResults } from "./ResearchResults";
import { cn } from "@/lib/utils";

const LOADING_MESSAGES = [
  "Visiting your website…",
  "Reading your brand story…",
  "Searching the web for mentions…",
  "Analyzing your competitors…",
  "Studying your brand voice…",
  "Identifying content themes…",
  "Activating AI content army…",
  "Drafting your strategy…",
  "Almost there…",
];

export type ResearchMergeMode = "add" | "replace";

export function ResearchButton({
  brandId,
  hasExistingPillars,
  cachedResult,
}: {
  brandId: string;
  hasExistingPillars: boolean;
  cachedResult: ResearchResult | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(cachedResult);
  const [error, setError] = useState<string | null>(null);
  const [wasCached, setWasCached] = useState(!!cachedResult);
  const [msgIndex, setMsgIndex] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mergeMode, setMergeMode] = useState<ResearchMergeMode>("add");

  useEffect(() => {
    if (!loading) {
      setMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  async function runResearch(bypassCache = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, bypassCache }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Research failed");
      setResult(data.result);
      setWasCached(data.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    if (hasExistingPillars && !cachedResult) {
      setShowConfirm(true);
    } else {
      runResearch(false);
    }
  }

  function proceedWithMode(mode: ResearchMergeMode) {
    setMergeMode(mode);
    setShowConfirm(false);
    runResearch(false);
  }

  function handleDone() {
    setResult(null);
    router.refresh();
  }

  if (result && !loading) {
    return (
      <div className="mb-6">
        <ResearchResults
          brandId={brandId}
          result={result}
          hasExistingPillars={hasExistingPillars}
          initialMergeMode={mergeMode}
          onDismiss={handleDone}
          onAccepted={handleDone}
        />
        {wasCached && (
          <button
            type="button"
            onClick={() => runResearch(true)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-muted hover:text-evergreen-600 transition"
          >
            <RotateCcw className="w-3 h-3" /> Re-run research (bypass cache)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition",
          loading
            ? "bg-evergreen-50 text-evergreen-600 cursor-wait"
            : "bg-evergreen-500 text-white hover:bg-evergreen-600"
        )}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-evergreen-300 border-t-evergreen-600 rounded-full animate-spin" />
            Researching brand…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Research brand with AI
          </>
        )}
      </button>

      {loading && (
        <div className="mt-3 rounded-lg bg-evergreen-50 border border-evergreen-100 px-4 py-3">
          <p className="text-sm text-evergreen-700 font-medium">
            {LOADING_MESSAGES[msgIndex]}
          </p>
          <p className="text-xs text-evergreen-600 mt-1">
            This can take 3-5 minutes — sit tight.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pre-research confirmation dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-ink/40 backdrop-blur-sm anim-fade-in"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-line flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
                You already have pillars
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-slate-muted hover:text-slate-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5">
              <h3 className="text-base font-semibold text-slate-ink mb-2">
                How should the AI handle them?
              </h3>
              <p className="text-sm text-slate-muted mb-4">
                The research will propose a fresh strategy. Choose what happens
                to your current pillars when you accept the results.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => proceedWithMode("add")}
                  className="w-full text-left rounded-lg border border-slate-line hover:border-evergreen-500 hover:bg-evergreen-50 p-4 transition"
                >
                  <div className="font-semibold text-sm text-slate-ink mb-0.5">
                    Add to my pillars
                  </div>
                  <div className="text-xs text-slate-muted">
                    Keep everything I have. Let me pick which new pillars to
                    append. Shares get rebalanced to 100%.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => proceedWithMode("replace")}
                  className="w-full text-left rounded-lg border border-slate-line hover:border-red-400 hover:bg-red-50 p-4 transition"
                >
                  <div className="font-semibold text-sm text-slate-ink mb-0.5">
                    Archive mine &amp; start fresh
                  </div>
                  <div className="text-xs text-slate-muted">
                    Move all my current pillars to the Archive, then let me pick
                    which new pillars to use. Recoverable for 30 days.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
