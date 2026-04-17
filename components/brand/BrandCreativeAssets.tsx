"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Sparkles, FileText } from "lucide-react";
import { MediaUploader } from "@/components/library/MediaUploader";
import { SuggestFromWebsite } from "@/components/brand/SuggestFromWebsite";
import { deleteMediaAsset, retagMediaAsset } from "@/app/actions/media";

export type CreativeAsset = {
  id: string;
  kind: "image" | "doc" | "video";
  url: string;
  caption: string | null;
  tags: string[];
  createdAt: string;
};

export function BrandCreativeAssets({
  brandId,
  assets,
  websiteUrl,
}: {
  brandId: string;
  assets: CreativeAsset[];
  websiteUrl: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.caption?.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [assets, query]);

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            CREATIVE ASSETS
          </div>
          <p className="text-sm text-slate-muted mt-0.5">
            Headshots, watermarks, product shots, graphics, logos of
            collaborators — anything the brand pulls from when composing
            imagery. Claude tags them on upload.
          </p>
        </div>
        <Link
          href="/app/library?tab=uploaded"
          className="text-xs text-slate-muted hover:text-evergreen-700 font-semibold self-start"
        >
          All uploaded →
        </Link>
      </div>

      <SuggestFromWebsite brandId={brandId} websiteUrl={websiteUrl} />

      <div className="mb-4">
        <MediaUploader
          brandId={brandId}
          purpose="creative"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          label="Drop creative assets here — headshots, watermarks, graphics"
          helpText="Images only. Claude vision tags each one so you can find them later."
        />
      </div>

      {assets.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creative assets…"
          className="w-full mb-3 rounded-lg border border-slate-line px-3 py-1.5 text-xs outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-line bg-slate-bg/40 px-4 py-6 text-center">
          <p className="text-xs text-slate-muted">
            {query
              ? `Nothing matched "${query}".`
              : "No creative assets yet. Drop files above to build the library the AI image generator pulls from."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="group relative rounded-lg border border-slate-line overflow-hidden bg-white hover:border-evergreen-300 transition"
            >
              <div className="aspect-square bg-slate-bg flex items-center justify-center overflow-hidden">
                {a.kind === "image" ? (
                  <Image
                    src={a.url}
                    alt={a.caption ?? "Creative asset"}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <FileText className="w-6 h-6 text-slate-muted" />
                )}
              </div>
              {a.tags.filter((t) => t !== "image" && t !== "creative-asset")
                .length > 0 && (
                <div className="px-1.5 py-1 flex flex-wrap gap-1">
                  {a.tags
                    .filter((t) => t !== "image" && t !== "creative-asset")
                    .slice(0, 2)
                    .map((t) => (
                      <span
                        key={t}
                        className="text-[8px] bg-slate-bg text-slate-muted font-mono px-1 py-0.5 rounded truncate max-w-full"
                        title={t}
                      >
                        {t}
                      </span>
                    ))}
                </div>
              )}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {a.kind === "image" && (
                  <button
                    type="button"
                    disabled={pending}
                    title="Re-tag"
                    onClick={() =>
                      startTransition(async () => {
                        await retagMediaAsset(a.id);
                      })
                    }
                    className="bg-white/90 hover:bg-white rounded p-1 shadow-sm border border-slate-line text-slate-muted hover:text-evergreen-600 disabled:opacity-50"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  title="Delete"
                  onClick={() => {
                    if (confirm("Delete this creative asset?")) {
                      startTransition(async () => {
                        await deleteMediaAsset(a.id);
                      });
                    }
                  }}
                  className="bg-white/90 hover:bg-white rounded p-1 shadow-sm border border-slate-line text-slate-muted hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
