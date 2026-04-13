"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const LOADING_MESSAGES = [
  "Reading your brand strategy…",
  "Picking under-served pillars…",
  "Selecting fresh angles…",
  "Reviewing recent captions…",
  "Crafting scroll-stopping hooks…",
  "Writing on-brand captions…",
  "Adding hashtags…",
  "Almost there…",
];

export function GenerateButton({
  brandId,
  hasPillars,
}: {
  brandId: string;
  hasPillars: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);

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

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, channel: "instagram", count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (!hasPillars) return null;

  return (
    <div>
      <button
        type="button"
        onClick={generate}
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
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate today&apos;s pack
          </>
        )}
      </button>

      {loading && (
        <div className="mt-3 rounded-lg bg-evergreen-50 border border-evergreen-100 px-4 py-3">
          <p className="text-sm text-evergreen-700 font-medium">
            {LOADING_MESSAGES[msgIndex]}
          </p>
          <p className="text-xs text-evergreen-600 mt-1">
            This usually takes 15-30 seconds.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
