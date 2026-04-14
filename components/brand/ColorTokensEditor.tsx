"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Pencil, Upload, Sparkles, X } from "lucide-react";
import { updateColorTokens } from "@/app/actions/brand";

type Tokens = {
  primary: string;
  ink: string;
  accent: string;
  background?: string;
  highlight?: string;
};

const TOKEN_DEFS: {
  key: keyof Tokens;
  label: string;
  help: string;
  fallback: string;
}[] = [
  { key: "primary", label: "Primary", help: "Hero color — buttons, pillar default", fallback: "#4EB35E" },
  { key: "ink", label: "Ink", help: "Body text on light backgrounds", fallback: "#44546C" },
  { key: "accent", label: "Accent", help: "Supporting highlights", fallback: "#9CC4AC" },
  { key: "background", label: "Background", help: "Optional brand surface", fallback: "#F7F7F2" },
  { key: "highlight", label: "Highlight", help: "Optional pop for callouts", fallback: "#F4B942" },
];

type Extracted = {
  caption: string;
  subject: string;
  emotion: string;
  colors: string[];
  tags: string[];
  previewUrl: string;
};

function cleanHex(raw: string): string | null {
  const s = raw.trim();
  const v = s.startsWith("#") ? s : `#${s}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : null;
}

export function ColorTokensEditor({
  brandId,
  initial,
}: {
  brandId: string;
  initial: Tokens;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [tokens, setTokens] = useState<Tokens>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);

  function onColorChange(key: keyof Tokens, value: string) {
    setTokens((t) => ({ ...t, [key]: value.toUpperCase() }));
  }

  function onHexBlur(key: keyof Tokens, value: string) {
    const cleaned = cleanHex(value);
    if (cleaned) setTokens((t) => ({ ...t, [key]: cleaned }));
  }

  function save() {
    const cleanPayload: Record<string, string> = {};
    for (const def of TOKEN_DEFS) {
      const v = tokens[def.key];
      if (v && /^#[0-9a-fA-F]{6}$/.test(v)) cleanPayload[def.key] = v.toUpperCase();
    }
    startTransition(async () => {
      await updateColorTokens(brandId, cleanPayload);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  async function handleExtract(file: File) {
    setExtractError(null);
    setExtracted(null);
    setExtracting(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      const form = new FormData();
      form.append("brandId", brandId);
      form.append("file", file);
      const res = await fetch("/api/brand/extract-palette", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Extraction failed" }));
        throw new Error(j.error ?? "Extraction failed");
      }
      const data = (await res.json()) as Omit<Extracted, "previewUrl">;
      setExtracted({ ...data, previewUrl });
      // Auto-enter edit mode so user can immediately apply
      setEditing(true);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  function applyColor(key: keyof Tokens, hex: string) {
    setTokens((t) => ({ ...t, [key]: hex.toUpperCase() }));
  }

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            COLOR TOKENS
          </div>
          <p className="text-sm text-slate-muted mt-0.5">
            The palette every generation — and every image — leans on. Upload
            a logo, swatch, or moodboard to auto-extract colors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleExtract(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={extracting}
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line px-3 py-1.5 text-xs font-semibold text-slate-ink hover:bg-slate-bg disabled:opacity-40"
            title="Extract palette from an image using Claude vision"
          >
            {extracting ? (
              <>
                <Sparkles className="w-3 h-3 animate-pulse text-evergreen-600" />
                Extracting…
              </>
            ) : (
              <>
                <Upload className="w-3 h-3" />
                Extract from image
              </>
            )}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs text-evergreen-600 font-semibold hover:text-evergreen-700"
            >
              <Check className="w-3.5 h-3.5" />
              {pending ? "Saving…" : "Save"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-slate-muted hover:text-evergreen-600"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
          {saved && !editing && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-evergreen-600 uppercase tracking-wider">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {extractError && (
        <div className="mb-3 rounded-lg border border-red-100 bg-red-50 text-red-700 text-xs px-3 py-2 flex items-start justify-between gap-2">
          <span>{extractError}</span>
          <button
            type="button"
            onClick={() => setExtractError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {extracted && (
        <ExtractedPreview
          extracted={extracted}
          onApply={applyColor}
          onClose={() => setExtracted(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TOKEN_DEFS.map((def) => {
          const value = (tokens[def.key] ?? def.fallback).toUpperCase();
          return (
            <div
              key={def.key}
              className="flex items-center gap-3 rounded-lg border border-slate-line px-3 py-2.5"
            >
              <input
                type="color"
                value={value}
                disabled={!editing}
                onChange={(e) => onColorChange(def.key, e.target.value)}
                className="w-9 h-9 rounded border border-slate-line cursor-pointer disabled:cursor-not-allowed"
                aria-label={`${def.label} color`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-muted font-bold">
                  {def.label}
                </div>
                <div className="text-[11px] text-slate-muted truncate">{def.help}</div>
              </div>
              <input
                type="text"
                value={value}
                disabled={!editing}
                onChange={(e) => onColorChange(def.key, e.target.value)}
                onBlur={(e) => onHexBlur(def.key, e.target.value)}
                className="w-20 rounded border border-slate-line px-2 py-1 text-xs font-mono outline-none focus:border-evergreen-500 disabled:bg-transparent disabled:border-transparent"
                maxLength={7}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExtractedPreview({
  extracted,
  onApply,
  onClose,
}: {
  extracted: Extracted;
  onApply: (key: keyof Tokens, hex: string) => void;
  onClose: () => void;
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const tokenKeys: (keyof Tokens)[] = [
    "primary",
    "ink",
    "accent",
    "background",
    "highlight",
  ];

  return (
    <div className="mb-4 rounded-xl border border-evergreen-200 bg-evergreen-50/40 p-3">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={extracted.previewUrl}
          alt="Uploaded image"
          className="w-20 h-20 rounded-lg object-cover border border-slate-line bg-white shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-evergreen-700 font-bold">
                EXTRACTED · CLAUDE VISION
              </div>
              {extracted.subject && (
                <div className="text-[12px] text-slate-ink mt-0.5">
                  <span className="font-semibold">{extracted.subject}</span>
                  {extracted.emotion && (
                    <span className="text-slate-muted"> · {extracted.emotion}</span>
                  )}
                </div>
              )}
              {extracted.caption && (
                <div className="text-[11px] text-slate-muted italic line-clamp-2 mt-0.5">
                  {extracted.caption}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-muted hover:text-slate-ink p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {extracted.colors.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {extracted.colors.map((c) => (
                <div key={c} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFor((cur) => (cur === c ? null : c))
                    }
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-line hover:border-evergreen-400 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] font-mono text-slate-ink transition"
                  >
                    <span
                      className="w-4 h-4 rounded-sm"
                      style={{ background: c }}
                    />
                    {c.toUpperCase()}
                  </button>
                  {openFor === c && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-white border border-slate-line rounded-lg shadow-lg z-20 min-w-[140px] overflow-hidden"
                    >
                      <div className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-slate-muted font-bold border-b border-slate-line">
                        Apply as
                      </div>
                      {tokenKeys.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            onApply(k, c);
                            setOpenFor(null);
                          }}
                          className="block w-full text-left px-2.5 py-1.5 text-[11px] text-slate-ink hover:bg-evergreen-50 transition capitalize"
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-muted italic mt-2">
              No distinct colors detected.
            </div>
          )}

          <p className="text-[10px] text-slate-muted mt-2">
            Click a swatch to apply it to a token. Changes aren&apos;t saved
            until you hit Save.
          </p>
        </div>
      </div>
    </div>
  );
}
