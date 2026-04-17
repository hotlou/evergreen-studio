"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Candidate = {
  url: string;
  alt: string | null;
  source: string;
};

export function SuggestFromWebsite({
  brandId,
  websiteUrl,
}: {
  brandId: string;
  websiteUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, startImport] = useTransition();
  const [imported, setImported] = useState<number | null>(null);

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    setImported(null);
    setSelected(new Set());
    setCandidates(null);
    try {
      const res = await fetch(
        `/api/brand/scrape-images?brandId=${encodeURIComponent(brandId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Couldn't load images.");
        return;
      }
      const list: Candidate[] = data.candidates ?? [];
      setCandidates(list);
      // Pre-select up to 6 of the largest-looking candidates (everything
      // returned passed the basic filters; user can deselect).
      setSelected(new Set(list.slice(0, 6).map((c) => c.url)));
    } finally {
      setLoading(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !candidates && !loading) loadCandidates();
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function handleImport() {
    if (selected.size === 0) return;
    startImport(async () => {
      const res = await fetch("/api/brand/scrape-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, urls: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Import failed.");
        return;
      }
      setImported(data?.imported?.length ?? 0);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (!websiteUrl) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5 mb-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <div className="text-[12px] text-slate-ink flex-1 min-w-0">
          <span className="font-semibold">Pull images from your website.</span>{" "}
          <span className="text-slate-muted">
            We&apos;ll grab candidates from{" "}
            <span className="font-mono text-[11px]">
              {tryHostname(websiteUrl)}
            </span>{" "}
            so you can import the ones that fit.
          </span>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 text-[11px] font-semibold px-2.5 py-1 transition shrink-0"
        >
          <Globe className="w-3 h-3" />
          {open ? "Hide" : "Suggest"}
        </button>
      </div>

      {open && (
        <div className="mt-3 anim-yellow-fade">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-muted py-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scanning your site for images…
            </div>
          )}
          {error && (
            <div className="rounded border border-red-100 bg-red-50 text-red-700 text-xs px-3 py-2">
              {error}
            </div>
          )}
          {imported !== null && imported > 0 && (
            <div className="rounded border border-evergreen-200 bg-evergreen-50 text-evergreen-800 text-xs px-3 py-2 flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              Imported {imported} image{imported === 1 ? "" : "s"} into your
              creative assets.
            </div>
          )}
          {imported === 0 && (
            <div className="rounded border border-red-100 bg-red-50 text-red-700 text-xs px-3 py-2">
              Couldn&apos;t import those images (CDN may have blocked us).
              Try uploading manually instead.
            </div>
          )}
          {candidates && candidates.length === 0 && !loading && (
            <div className="text-xs text-slate-muted py-2">
              No usable images found on the page. Try uploading directly
              below.
            </div>
          )}
          {candidates && candidates.length > 0 && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-3">
                {candidates.map((c) => {
                  const sel = selected.has(c.url);
                  return (
                    <button
                      key={c.url}
                      type="button"
                      onClick={() => toggle(c.url)}
                      title={c.alt ?? c.url}
                      className={cn(
                        "group relative rounded-lg overflow-hidden border-2 text-left transition",
                        sel
                          ? "border-evergreen-500 ring-2 ring-evergreen-100"
                          : "border-slate-line hover:border-evergreen-300"
                      )}
                    >
                      <div className="aspect-square bg-slate-bg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.url}
                          alt={c.alt ?? ""}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity =
                              "0.2";
                          }}
                        />
                      </div>
                      {sel ? (
                        <div className="absolute top-1 right-1 bg-evergreen-500 text-white rounded-full p-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="absolute top-1 right-1 bg-white/80 text-slate-muted rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                          <X className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-muted">
                  {selected.size} of {candidates.length} selected
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadCandidates}
                    disabled={loading || importing}
                    className="text-[11px] text-slate-muted hover:text-slate-ink"
                  >
                    Re-scan
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={selected.size === 0 || importing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-40 text-white font-semibold text-xs px-3 py-1.5 transition"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Importing…
                      </>
                    ) : (
                      <>Import selected</>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Image rendered with a plain <img> rather than next/image because remote
// hosts are unknown and we don't want to add a wildcard remotePatterns.
// Suppress the lint warning above where used.
void Image;

function tryHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
