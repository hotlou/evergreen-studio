"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Upload, X, FileText, Wand2 } from "lucide-react";
import type { BrandSignals } from "@/lib/brand-signals";
import { cn } from "@/lib/utils";

export function PasteAnythingPanel({ brandId }: { brandId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BrandSignals | null>(null);
  const [merged, setMerged] = useState<{ learningsCreated: number } | null>(
    null
  );

  function addFiles(fl: FileList | null) {
    if (!fl) return;
    const next = [...files];
    for (const f of Array.from(fl)) {
      if (next.find((x) => x.name === f.name && x.size === f.size)) continue;
      next.push(f);
    }
    setFiles(next.slice(0, 6));
  }

  async function runParse(autoMerge: boolean) {
    setError(null);
    setResult(null);
    setMerged(null);
    if (autoMerge) setMerging(true);
    else setParsing(true);

    try {
      const form = new FormData();
      form.append("brandId", brandId);
      form.append("text", text);
      if (autoMerge) form.append("merge", "1");
      for (const f of files) form.append("files", f);

      const res = await fetch("/api/brand/parse", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Parse failed" }));
        throw new Error(j.error ?? "Parse failed");
      }
      const data = await res.json();
      setResult(data.signals as BrandSignals);
      if (data.merged) {
        setMerged({ learningsCreated: data.learningsCreated ?? 0 });
        setText("");
        setFiles([]);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsing(false);
      setMerging(false);
    }
  }

  async function mergeExisting() {
    if (!result) return;
    setMerging(true);
    setError(null);
    try {
      const res = await fetch("/api/brand/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId, text, merge: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Merge failed" }));
        throw new Error(j.error ?? "Merge failed");
      }
      const data = await res.json();
      setMerged({ learningsCreated: data.learningsCreated ?? 0 });
      setText("");
      setFiles([]);
      setResult(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  }

  const busy = parsing || merging;
  const hasInput = text.trim().length > 10 || files.length > 0;

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-evergreen-600" />
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            PASTE ANYTHING · AI-POWERED BRAND SIGNAL PARSER
          </div>
        </div>
        <p className="text-sm text-slate-muted mt-1.5">
          Dump in raw notes, URLs, website/email copy, review quotes, a voice
          guide, images, a PDF, or anything in between. Evergreen extracts it
          all and folds it into your voice, taboos, and learnings.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        disabled={busy}
        placeholder={`Paste anything. Examples:
• "Never say 'detox', 'clean', or 'gamechanger'"
• A link to a competitor page + 3 sentences about our angle
• A press quote from our last launch
• Founder notes, tone references, a Notion dump...`}
        className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-[13px] leading-relaxed text-slate-ink outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none font-mono disabled:opacity-60"
      />

      {/* File attachments */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".md,.txt,text/plain,text/markdown,.pdf,.doc,.docx,image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-muted hover:bg-slate-bg disabled:opacity-50"
        >
          <Upload className="w-3 h-3" />
          Attach file
        </button>

        {files.map((f) => (
          <span
            key={`${f.name}-${f.size}`}
            className="inline-flex items-center gap-1.5 bg-slate-bg border border-slate-line rounded-full px-2.5 py-1 text-[11px] text-slate-ink"
          >
            <FileText className="w-3 h-3" />
            <span className="max-w-[160px] truncate">{f.name}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setFiles(files.filter((x) => x !== f))}
              className="hover:text-red-600 disabled:opacity-40"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => runParse(false)}
          disabled={busy || !hasInput}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-ink hover:bg-slate-bg disabled:opacity-40"
        >
          <Wand2 className="w-3 h-3" />
          {parsing ? "Parsing…" : "Preview signals"}
        </button>
        <button
          type="button"
          onClick={() => runParse(true)}
          disabled={busy || !hasInput}
          className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-xs px-3 py-1.5 transition"
        >
          <Sparkles className="w-3 h-3" />
          {merging ? "Merging…" : "Parse & merge"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2">
          {error}
        </div>
      )}

      {merged && (
        <div className="mt-3 rounded-lg bg-evergreen-50 border border-evergreen-100 text-evergreen-800 text-xs px-3 py-2">
          Signals merged into this brand.
          {merged.learningsCreated > 0 &&
            ` Captured ${merged.learningsCreated} new learning${
              merged.learningsCreated === 1 ? "" : "s"
            }.`}
        </div>
      )}

      {result && !merged && (
        <SignalsPreview signals={result} onMerge={mergeExisting} busy={busy} />
      )}
    </section>
  );
}

function SignalsPreview({
  signals,
  onMerge,
  busy,
}: {
  signals: BrandSignals;
  onMerge: () => void;
  busy: boolean;
}) {
  const empty =
    !signals.voiceAdditions.trim() &&
    signals.taboos.length === 0 &&
    signals.learnings.length === 0 &&
    signals.colorHints.length === 0;

  return (
    <div className="mt-4 rounded-xl border border-slate-line bg-slate-bg/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
          PREVIEW · EXTRACTED SIGNALS
        </div>
        {!empty && (
          <button
            type="button"
            onClick={onMerge}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-xs px-3 py-1.5 transition"
          >
            <Sparkles className="w-3 h-3" /> Merge into brand
          </button>
        )}
      </div>

      <div className="mb-3 text-[13px] text-slate-ink italic">{signals.summary}</div>

      {empty && (
        <div className="text-xs text-slate-muted">
          Nothing worth merging — the paste looks like noise. Add more context
          and try again.
        </div>
      )}

      {signals.voiceAdditions.trim() && (
        <PreviewRow label="Voice additions">
          <div className="whitespace-pre-wrap text-[13px] text-slate-ink">
            {signals.voiceAdditions}
          </div>
        </PreviewRow>
      )}

      {signals.taboos.length > 0 && (
        <PreviewRow label="Taboos">
          <div className="flex flex-wrap gap-1.5">
            {signals.taboos.map((t) => (
              <span
                key={t}
                className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-semibold"
              >
                {t}
              </span>
            ))}
          </div>
        </PreviewRow>
      )}

      {signals.learnings.length > 0 && (
        <PreviewRow label="Learnings">
          <div className="space-y-1">
            {signals.learnings.map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5",
                    l.kind === "do_this" && "bg-evergreen-100 text-evergreen-700",
                    l.kind === "dont" && "bg-red-100 text-red-700",
                    l.kind === "tone" && "bg-indigo-100 text-indigo-700",
                    l.kind === "visual" && "bg-amber-100 text-amber-800"
                  )}
                >
                  {l.kind.replace("_", " ")}
                </span>
                <span className="text-slate-ink">{l.text}</span>
              </div>
            ))}
          </div>
        </PreviewRow>
      )}

      {signals.colorHints.length > 0 && (
        <PreviewRow label="Color hints">
          <div className="flex flex-wrap gap-2">
            {signals.colorHints.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 bg-white border border-slate-line rounded-full px-2 py-1 text-[11px] font-mono text-slate-ink"
              >
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: c }}
                />
                {c.toUpperCase()}
              </span>
            ))}
          </div>
        </PreviewRow>
      )}
    </div>
  );
}

function PreviewRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-start py-2 border-t border-slate-line first:border-t-0">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
