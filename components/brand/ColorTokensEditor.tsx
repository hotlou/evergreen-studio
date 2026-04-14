"use client";

import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
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
  const [editing, setEditing] = useState(false);
  const [tokens, setTokens] = useState<Tokens>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

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

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            COLOR TOKENS
          </div>
          <p className="text-sm text-slate-muted mt-0.5">
            The palette every generation — and soon every image — leans on.
          </p>
        </div>
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
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-evergreen-600 uppercase tracking-wider ml-2">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>

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
