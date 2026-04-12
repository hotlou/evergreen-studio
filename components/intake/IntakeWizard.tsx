"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { createBrand } from "@/app/actions/brand";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "identity", label: "Identity" },
  { key: "voice", label: "Voice" },
  { key: "taboos", label: "Taboos" },
  { key: "channels", label: "Channels" },
  { key: "review", label: "Review" },
] as const;

const CHANNELS = [
  { id: "instagram", label: "Instagram", available: true },
  { id: "tiktok", label: "TikTok", available: false },
  { id: "linkedin", label: "LinkedIn", available: false },
  { id: "x", label: "X / Twitter", available: false },
];

export function IntakeWizard() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4EB35E");
  const [voiceGuide, setVoiceGuide] = useState("");
  const [taboos, setTaboos] = useState<string[]>([]);
  const [taboosInput, setTaboosInput] = useState("");
  const [channels, setChannels] = useState<string[]>(["instagram"]);
  const [submitting, setSubmitting] = useState(false);

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return voiceGuide.trim().length > 0;
    return true;
  };

  function addTaboo() {
    const v = taboosInput.trim().toLowerCase();
    if (v && !taboos.includes(v)) setTaboos([...taboos, v]);
    setTaboosInput("");
  }

  async function handleSubmit(formData: FormData) {
    formData.set("name", name);
    formData.set("voiceGuide", voiceGuide);
    formData.set("taboosList", taboos.join("\n"));
    formData.set("primaryColor", primaryColor);
    for (const c of channels) formData.append("channels", c);
    setSubmitting(true);
    // Server action redirects to /app/today on success; errors bubble to Next error UI.
    await createBrand(formData);
  }

  return (
    <form
      action={handleSubmit}
      className="max-w-2xl mx-auto"
      onSubmit={(e) => {
        // Block the form submission unless we're on the review step — the
        // Next/Back buttons should not submit.
        if (step !== STEPS.length - 1) e.preventDefault();
      }}
    >
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition shrink-0",
                i < step && "bg-evergreen-500 text-white",
                i === step && "bg-evergreen-500 text-white ring-4 ring-evergreen-100",
                i > step && "bg-slate-line text-slate-muted"
              )}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <div
              className={cn(
                "text-[10px] font-mono uppercase tracking-wider font-semibold",
                i <= step ? "text-slate-ink" : "text-slate-muted"
              )}
            >
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px",
                  i < step ? "bg-evergreen-500" : "bg-slate-line"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-line bg-white shadow-soft p-8 min-h-[380px] flex flex-col">
        <div className="flex-1">
          {step === 0 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                What&apos;s the brand?
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                A name and a primary color. You can refine everything else later.
              </p>
              <label className="block mb-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5 font-semibold">
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Combat Candy"
                  className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5 font-semibold">
                  Primary color
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 rounded border border-slate-line cursor-pointer"
                  />
                  <code className="font-mono text-sm text-slate-ink">
                    {primaryColor.toUpperCase()}
                  </code>
                </div>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                How does the brand sound?
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                The voice guide every generation obeys. Be specific — adjectives,
                examples, rules.
              </p>
              <textarea
                value={voiceGuide}
                onChange={(e) => setVoiceGuide(e.target.value)}
                rows={9}
                placeholder="Punchy, deadpan, self-aware. Humor lands through implication. Never sycophantic, never 'wellness-coded.' If it sounds like a supplement brand, rewrite it."
                className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none leading-relaxed"
              />
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                Words we never generate
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                Hard-blocked across all pillars. Add the ones that make you wince.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={taboosInput}
                  onChange={(e) => setTaboosInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTaboo();
                    }
                  }}
                  placeholder="melt"
                  className="flex-1 rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
                />
                <button
                  type="button"
                  onClick={addTaboo}
                  className="rounded-lg border border-slate-line px-4 text-sm font-semibold hover:bg-slate-bg"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {taboos.length === 0 && (
                  <div className="text-xs text-slate-muted italic">
                    No taboos yet. Common picks: &ldquo;gamechanger&rdquo;,
                    &ldquo;unlock&rdquo;, &ldquo;clean&rdquo;, &ldquo;detox&rdquo;.
                  </div>
                )}
                {taboos.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTaboos(taboos.filter((x) => x !== t))}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-100 px-3 py-1 text-xs font-semibold hover:bg-red-100 transition"
                  >
                    {t} <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                Where does this brand publish?
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                v1 ships Instagram captions. More channels unlock in v1.1.
              </p>
              <div className="space-y-2">
                {CHANNELS.map((c) => {
                  const selected = channels.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!c.available}
                      onClick={() =>
                        setChannels(
                          selected
                            ? channels.filter((x) => x !== c.id)
                            : [...channels, c.id]
                        )
                      }
                      className={cn(
                        "w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm text-left transition",
                        selected
                          ? "border-evergreen-500 bg-evergreen-50 text-evergreen-700 font-semibold"
                          : "border-slate-line text-slate-ink hover:bg-slate-bg",
                        !c.available && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span>{c.label}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider">
                        {!c.available
                          ? "v1.1"
                          : selected
                          ? "✓ On"
                          : "Off"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">Review</h2>
              <p className="text-sm text-slate-muted mb-6">
                Make sure this looks right. You&apos;ll be able to edit everything
                from the Strategy view.
              </p>
              <div className="space-y-4 text-sm">
                <ReviewRow label="Name" value={name} />
                <ReviewRow
                  label="Primary color"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ background: primaryColor }}
                      />
                      <code className="font-mono">{primaryColor.toUpperCase()}</code>
                    </span>
                  }
                />
                <ReviewRow
                  label="Voice"
                  value={
                    <span className="text-slate-muted italic line-clamp-3">
                      {voiceGuide || "—"}
                    </span>
                  }
                />
                <ReviewRow
                  label="Taboos"
                  value={
                    taboos.length ? (
                      <span className="flex flex-wrap gap-1">
                        {taboos.map((t) => (
                          <span
                            key={t}
                            className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-slate-muted">none</span>
                    )
                  }
                />
                <ReviewRow
                  label="Channels"
                  value={channels.join(", ") || "—"}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-line">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 text-sm text-slate-muted hover:text-slate-ink disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2.5 transition"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 transition"
            >
              {submitting ? "Creating…" : "Create brand"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-semibold pt-0.5">
        {label}
      </div>
      <div className="text-slate-ink">{value}</div>
    </div>
  );
}
