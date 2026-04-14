"use client";

import { useState, useTransition } from "react";
import { Wand2, X, Check } from "lucide-react";
import type { RedirectScope } from "@/lib/research/redirect";
import {
  applyRedirectVoice,
  applyRedirectTaboos,
  applyRedirectPillars,
} from "@/app/actions/strategy";
import { cn } from "@/lib/utils";

type RedirectResult =
  | { scope: "pillars"; pillars: Array<{ name: string; description: string; targetShare: number; color: string; angles: string[] }> }
  | { scope: "voice"; voiceGuide: string }
  | { scope: "taboos"; tabooWords: string[] };

const AGE_OPTIONS = ["Gen Z (13-27)", "Millennial (28-43)", "Gen X (44-59)", "Boomer (60+)"];
const GENDER_OPTIONS = ["All", "Primarily women", "Primarily men", "Non-binary"];
const GEO_OPTIONS = ["US", "North America", "UK/EU", "Global English", "Urban", "Suburban"];

export function RedirectButton({
  brandId,
  scope,
  label,
}: {
  brandId: string;
  scope: RedirectScope;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [age, setAge] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [geo, setGeo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedirectResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const demographics: Record<string, string> = {};
      if (age) demographics.ageRange = age;
      if (gender) demographics.gender = gender;
      if (geo) demographics.geography = geo;

      const res = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          scope,
          prompt,
          demographics: Object.keys(demographics).length > 0 ? demographics : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Redirect failed");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redirect failed");
    } finally {
      setLoading(false);
    }
  }

  function apply(mode: "replace" | "append" = "replace") {
    if (!result) return;
    startTransition(async () => {
      if (result.scope === "voice") {
        await applyRedirectVoice(brandId, result.voiceGuide);
      } else if (result.scope === "taboos") {
        await applyRedirectTaboos(brandId, result.tabooWords);
      } else {
        await applyRedirectPillars(brandId, result.pillars, mode);
      }
      setOpen(false);
      setPrompt("");
      setResult(null);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-slate-muted hover:text-evergreen-600 transition"
        title={`Redirect ${label}`}
      >
        <Wand2 className="w-3 h-3" /> Redirect
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-evergreen-200 bg-evergreen-50 p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-evergreen-800 font-bold">
          Redirect {label}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setResult(null);
            setError(null);
          }}
          className="text-slate-muted hover:text-slate-ink p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!result && (
        <>
          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={
              scope === "pillars"
                ? "e.g. 'Swap in more science-heavy pillars focused on clinical studies'"
                : scope === "voice"
                ? "e.g. 'Make the voice more playful and less corporate'"
                : "e.g. 'Add more industry jargon we should avoid'"
            }
            className="w-full text-sm border border-slate-line rounded-lg px-3 py-2 outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none"
          />

          {scope !== "taboos" && (
            <div className="mt-3 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold">
                Audience pills (optional)
              </div>
              <PillRow options={AGE_OPTIONS} value={age} onChange={setAge} />
              <PillRow options={GENDER_OPTIONS} value={gender} onChange={setGender} />
              <PillRow options={GEO_OPTIONS} value={geo} onChange={setGeo} />
            </div>
          )}

          {error && (
            <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={run}
              disabled={!prompt.trim() || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 text-white text-xs font-semibold px-3 py-1.5 hover:bg-evergreen-600 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Wand2 className="w-3 h-3" /> Generate
                </>
              )}
            </button>
          </div>
        </>
      )}

      {result && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-evergreen-800 font-bold mb-2">
            Proposal
          </div>
          <div className="bg-white border border-slate-line rounded-lg p-3 text-[13px] text-slate-ink mb-3 max-h-72 overflow-auto">
            {result.scope === "voice" && (
              <p className="whitespace-pre-wrap">{result.voiceGuide}</p>
            )}
            {result.scope === "taboos" && (
              <div className="flex flex-wrap gap-1">
                {result.tabooWords.map((t) => (
                  <span
                    key={t}
                    className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {result.scope === "pillars" && (
              <div className="space-y-2">
                {result.pillars.map((p, i) => (
                  <div key={i} className="border-b border-slate-line pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ background: p.color }}
                      >
                        {p.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-muted">
                        {Math.round(p.targetShare * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-muted mb-1">{p.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.angles.map((a) => (
                        <span
                          key={a}
                          className="text-[10px] bg-slate-bg px-2 py-0.5 rounded-full text-slate-muted"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setPrompt("");
              }}
              className="text-xs text-slate-muted hover:text-slate-ink px-3 py-1.5"
            >
              Try again
            </button>
            {result.scope === "pillars" ? (
              <>
                <button
                  type="button"
                  onClick={() => apply("append")}
                  disabled={pending}
                  className="text-xs font-semibold border border-evergreen-500 text-evergreen-700 rounded-lg px-3 py-1.5 hover:bg-evergreen-100 disabled:opacity-40"
                >
                  Append to existing
                </button>
                <button
                  type="button"
                  onClick={() => apply("replace")}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-evergreen-500 text-white rounded-lg px-3 py-1.5 hover:bg-evergreen-600 disabled:opacity-40"
                >
                  <Check className="w-3 h-3" /> Replace all
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => apply("replace")}
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-evergreen-500 text-white rounded-lg px-3 py-1.5 hover:bg-evergreen-600 disabled:opacity-40"
              >
                <Check className="w-3 h-3" />
                {pending ? "Saving…" : "Replace current"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PillRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(active ? null : opt)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition",
              active
                ? "bg-evergreen-500 text-white border-evergreen-500"
                : "bg-white text-slate-muted border-slate-line hover:border-evergreen-300"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
