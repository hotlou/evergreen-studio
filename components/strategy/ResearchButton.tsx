"use client";

import { useState } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import type { ResearchResult } from "@/lib/research/prompts";
import { ResearchResults } from "./ResearchResults";
import { cn } from "@/lib/utils";

export function ResearchButton({
  brandId,
  hasExistingPillars,
  cachedResult,
}: {
  brandId: string;
  hasExistingPillars: boolean;
  cachedResult: ResearchResult | null;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(cachedResult);
  const [error, setError] = useState<string | null>(null);
  const [wasCached, setWasCached] = useState(!!cachedResult);

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

  if (result && !loading) {
    return (
      <div className="mb-6">
        <ResearchResults
          brandId={brandId}
          result={result}
          hasExistingPillars={hasExistingPillars}
          onDismiss={() => setResult(null)}
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
        onClick={() => runResearch(false)}
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
        <p className="text-xs text-slate-muted mt-2">
          Scraping website, analyzing brand, drafting strategy… this takes 10-20 seconds.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
