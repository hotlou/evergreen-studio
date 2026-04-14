"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { FileText, Film, Search, Trash2, Sparkles } from "lucide-react";
import {
  deleteMediaAsset,
  retagMediaAsset,
} from "@/app/actions/media";

export type MediaGridItem = {
  id: string;
  kind: "image" | "doc" | "video";
  source: "generated" | "uploaded" | "ingested";
  url: string;
  caption: string | null;
  tags: string[];
  createdAt: string;
};

export function MediaGrid({ items }: { items: MediaGridItem[] }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      if (it.caption?.toLowerCase().includes(q)) return true;
      if (it.tags.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [items, query]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search captions and tags…"
          className="w-full rounded-lg border border-slate-line pl-9 pr-3 py-2 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-line bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-muted max-w-md mx-auto">
            {query
              ? `Nothing matched "${query}".`
              : "Nothing uploaded yet. Drop files above to start building your library."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              pending={pending}
              onRetag={() =>
                startTransition(async () => {
                  await retagMediaAsset(item.id);
                })
              }
              onDelete={() =>
                startTransition(async () => {
                  if (confirm("Delete this media asset?")) {
                    await deleteMediaAsset(item.id);
                  }
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({
  item,
  pending,
  onRetag,
  onDelete,
}: {
  item: MediaGridItem;
  pending: boolean;
  onRetag: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-slate-line bg-white overflow-hidden hover:border-evergreen-300 transition">
      <div className="aspect-square w-full bg-slate-bg flex items-center justify-center overflow-hidden">
        {item.kind === "image" ? (
          <Image
            src={item.url}
            alt={item.caption ?? "Media asset"}
            width={300}
            height={300}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : item.kind === "video" ? (
          <Film className="w-8 h-8 text-slate-muted" />
        ) : (
          <FileText className="w-8 h-8 text-slate-muted" />
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-center gap-1 flex-wrap mb-1">
          <span
            className={`inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              item.source === "generated"
                ? "bg-indigo-50 text-indigo-700"
                : item.source === "uploaded"
                ? "bg-evergreen-50 text-evergreen-700"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {item.source}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-muted">
            {item.kind}
          </span>
        </div>
        <div className="text-[11px] text-slate-ink leading-snug line-clamp-2 mb-1.5">
          {item.caption || (
            <span className="text-slate-muted italic">(no caption)</span>
          )}
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[9px] bg-slate-bg text-slate-muted font-mono px-1 py-0.5 rounded"
              >
                {t}
              </span>
            ))}
            {item.tags.length > 4 && (
              <span className="text-[9px] text-slate-muted font-mono">
                +{item.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.kind === "image" && (
          <button
            type="button"
            onClick={onRetag}
            disabled={pending}
            title="Re-tag with Claude vision"
            className="bg-white/90 hover:bg-white rounded p-1.5 shadow-sm border border-slate-line text-slate-muted hover:text-evergreen-600 disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          title="Delete"
          className="bg-white/90 hover:bg-white rounded p-1.5 shadow-sm border border-slate-line text-slate-muted hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
