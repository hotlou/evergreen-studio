"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Plus,
  Globe,
  Link2,
  Upload,
  Sparkles,
} from "lucide-react";
import { createBrand } from "@/app/actions/brand";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "identity", label: "Identity" },
  { key: "logo", label: "Logo" },
  { key: "voice", label: "Voice" },
  { key: "taboos", label: "Taboos" },
  { key: "channels", label: "Channels" },
  { key: "review", label: "Review" },
] as const;

const CHANNELS = [
  { id: "instagram", label: "Instagram", available: true },
  { id: "facebook", label: "Facebook", available: true },
  { id: "tiktok", label: "TikTok", available: false },
  { id: "linkedin", label: "LinkedIn", available: false },
  { id: "x", label: "X / Twitter", available: false },
  { id: "threads", label: "Threads", available: false },
  { id: "youtube", label: "YouTube", available: false },
  { id: "pinterest", label: "Pinterest", available: false },
];

type WizardMode = "splash" | "wizard";

export function IntakeWizard() {
  const [mode, setMode] = useState<WizardMode>("splash");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4EB35E");
  const [hexInput, setHexInput] = useState("#4EB35E");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [refUrlInput, setRefUrlInput] = useState("");
  const [voiceGuide, setVoiceGuide] = useState("");
  const [pasteContext, setPasteContext] = useState("");
  const [taboos, setTaboos] = useState<string[]>([]);
  const [taboosInput, setTaboosInput] = useState("");
  const [channels, setChannels] = useState<string[]>(["instagram"]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  // Splash-step state (website-URL-first onboarding)
  const [splashUrl, setSplashUrl] = useState("");
  const [inferring, setInferring] = useState(false);
  const [inferError, setInferError] = useState<string | null>(null);
  const [inferNote, setInferNote] = useState<string | null>(null);

  async function handleInferFromUrl() {
    const trimmed = splashUrl.trim();
    if (!trimmed) return;
    setInferring(true);
    setInferError(null);
    setInferNote(null);
    try {
      const res = await fetch("/api/brand/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInferError(data?.error ?? "Couldn't infer from that URL.");
        return;
      }

      const result = data.result as {
        name: string;
        voiceGuide: string;
        tabooWords: string[];
        suggestedChannels: string[];
        primaryColor: string;
      };
      const normalizedUrl = data.url as string | undefined;

      setName(result.name);
      setVoiceGuide(result.voiceGuide);
      setTaboos(
        result.tabooWords
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0 && t.length <= 40)
      );
      setPrimaryColor(result.primaryColor.toUpperCase());
      setHexInput(result.primaryColor.toUpperCase());
      setWebsiteUrl(normalizedUrl ?? trimmed);
      const available = new Set(
        CHANNELS.filter((c) => c.available).map((c) => c.id)
      );
      const suggested = result.suggestedChannels.filter((c) => available.has(c));
      setChannels(suggested.length > 0 ? suggested : ["instagram"]);
      setInferNote(
        "We pre-filled the basics from your site. Review each step, tweak anything, then create."
      );
      setMode("wizard");
      setStep(0);
    } catch (err) {
      console.error(err);
      setInferError("Something went wrong. Please try again or start from scratch.");
    } finally {
      setInferring(false);
    }
  }

  function handleSkipToManual() {
    setInferNote(null);
    setInferError(null);
    setMode("wizard");
    setStep(0);
  }

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    return true;
  };

  function handleColorPickerChange(hex: string) {
    setPrimaryColor(hex);
    setHexInput(hex.toUpperCase());
  }

  function handleHexInputChange(raw: string) {
    setHexInput(raw);
    const cleaned = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      setPrimaryColor(cleaned);
    }
  }

  function addTaboo() {
    const v = taboosInput.trim().toLowerCase();
    if (v && !taboos.includes(v)) setTaboos([...taboos, v]);
    setTaboosInput("");
  }

  function addRefUrl() {
    const v = refUrlInput.trim();
    if (v && !referenceUrls.includes(v)) {
      setReferenceUrls([...referenceUrls, v]);
    }
    setRefUrlInput("");
  }

  function handleLogoSelect(file: File) {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);

    formData.set("name", name);
    formData.set("primaryColor", primaryColor);
    formData.set("websiteUrl", websiteUrl);
    formData.set("referenceUrls", referenceUrls.join("\n"));
    formData.set("voiceGuide", voiceGuide);
    formData.set("taboosList", taboos.join("\n"));
    formData.set("pasteContext", pasteContext);
    if (logoFile) formData.set("logoFile", logoFile);
    for (const c of channels) formData.append("channels", c);
    await createBrand(formData);
  }

  if (mode === "splash") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-slate-line bg-white shadow-soft p-8">
          <div className="inline-flex items-center gap-1.5 bg-evergreen-50 text-evergreen-700 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3" /> New brand
          </div>
          <h2 className="font-display text-2xl text-slate-ink mb-1">
            What&apos;s your website?
          </h2>
          <p className="text-sm text-slate-muted mb-6">
            Drop in your URL and we&apos;ll pre-fill the basics — name, voice,
            taboos, brand color, and likely channels. You&apos;ll review each
            step before creating the brand.
          </p>

          {inferError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {inferError}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={splashUrl}
                onChange={(e) => setSplashUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && splashUrl.trim() && !inferring) {
                    e.preventDefault();
                    handleInferFromUrl();
                  }
                }}
                placeholder="yourbrand.com"
                disabled={inferring}
                autoFocus
                className="w-full rounded-lg border border-slate-line pl-9 pr-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 disabled:opacity-60"
              />
            </div>
            <button
              type="button"
              onClick={handleInferFromUrl}
              disabled={inferring || splashUrl.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 transition"
            >
              {inferring ? (
                <>Analyzing…</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Pre-fill
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-muted">
            No site yet, or want full control?{" "}
            <button
              type="button"
              onClick={handleSkipToManual}
              className="text-evergreen-700 hover:text-evergreen-800 font-semibold underline-offset-2 hover:underline"
            >
              Set up manually instead
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="max-w-2xl mx-auto"
      onSubmit={(e) => {
        if (step !== STEPS.length - 1) e.preventDefault();
      }}
    >
      {inferNote && (
        <div className="mb-4 rounded-lg bg-evergreen-50 border border-evergreen-100 px-4 py-3 text-sm text-evergreen-800 flex items-start gap-2">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{inferNote}</span>
          <button
            type="button"
            onClick={() => setInferNote(null)}
            className="ml-auto text-evergreen-700 hover:text-evergreen-800"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                "text-[10px] font-mono uppercase tracking-wider font-semibold hidden sm:block",
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

      <div className="rounded-xl border border-slate-line bg-white shadow-soft p-8 min-h-[420px] flex flex-col">
        <div className="flex-1">
          {/* Step 0: Identity */}
          {step === 0 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                What&apos;s the brand?
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                Name, website, color, and any reference material. The AI
                research step (coming in M2) will use the website to
                pre-fill your strategy.
              </p>

              <label className="block mb-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5 font-semibold">
                  Brand name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Combat Candy"
                  className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
                />
              </label>

              <label className="block mb-4">
                <span className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5 font-semibold">
                  <Globe className="w-3 h-3" /> Website URL
                </span>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://combatcandy.com"
                  className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
                />
              </label>

              <div className="mb-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5 font-semibold">
                  Primary color
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => handleColorPickerChange(e.target.value)}
                    className="w-12 h-10 rounded border border-slate-line cursor-pointer"
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    placeholder="#4EB35E"
                    maxLength={7}
                    className="w-24 rounded-lg border border-slate-line px-2.5 py-2 text-sm font-mono outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
                  />
                  <span
                    className="w-8 h-8 rounded-md border border-slate-line"
                    style={{ background: primaryColor }}
                  />
                </div>
              </div>

              <div>
                <span className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5 font-semibold">
                  <Link2 className="w-3 h-3" /> Reference URLs
                  <span className="font-normal normal-case tracking-normal text-slate-muted">(optional)</span>
                </span>
                <p className="text-xs text-slate-muted mb-2">
                  News articles, reviews, competitor pages, or anything that
                  helps the AI understand this brand.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={refUrlInput}
                    onChange={(e) => setRefUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addRefUrl(); }
                    }}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-slate-line px-3 py-2 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
                  />
                  <button
                    type="button"
                    onClick={addRefUrl}
                    disabled={!refUrlInput.trim()}
                    className="rounded-lg border border-slate-line px-3 text-sm font-semibold hover:bg-slate-bg disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {referenceUrls.map((u) => (
                  <div key={u} className="flex items-center gap-2 text-xs text-slate-muted mb-1">
                    <span className="truncate flex-1">{u}</span>
                    <button
                      type="button"
                      onClick={() => setReferenceUrls(referenceUrls.filter((x) => x !== u))}
                      className="text-slate-muted hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 1: Logo */}
          {step === 1 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                Drop in the logo
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                Optional. You can add or replace it on the Brand page later.
                We&apos;ll reference the palette when generating images.
              </p>

              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoSelect(f);
                  e.target.value = "";
                }}
              />

              <div className="flex items-center gap-5">
                <div
                  className="w-32 h-32 rounded-xl border border-dashed border-slate-line flex items-center justify-center overflow-hidden bg-slate-bg/40"
                >
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={128}
                      height={128}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-muted text-center px-2">
                      No logo yet
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => logoInput.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-xs px-3 py-2 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {logoPreview ? "Replace" : "Choose file"}
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-muted hover:text-red-600"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                  <p className="text-[11px] text-slate-muted max-w-[220px]">
                    PNG, JPG, WebP, or SVG.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Voice */}
          {step === 2 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                How does the brand sound?
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                Write a voice guide, or paste anything (notes, URLs, competitor
                copy, press quotes) — Claude will extract signals into voice,
                taboos, and learnings after the brand is created.
              </p>
              <textarea
                value={voiceGuide}
                onChange={(e) => setVoiceGuide(e.target.value)}
                rows={6}
                placeholder="Punchy, deadpan, self-aware. Humor lands through implication. Never sycophantic, never 'wellness-coded.' If it sounds like a supplement brand, rewrite it."
                className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none leading-relaxed mb-4"
              />

              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-muted mb-1.5 font-semibold">
                  <Sparkles className="w-3 h-3 text-evergreen-600" /> Paste anything
                  <span className="font-normal normal-case tracking-normal">(optional)</span>
                </span>
                <textarea
                  value={pasteContext}
                  onChange={(e) => setPasteContext(e.target.value)}
                  rows={5}
                  placeholder="Paste raw notes, URLs, reviews, competitor pages, voice references — anything. Claude will fold the signal into your brand after we create it."
                  className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-sm outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none leading-relaxed font-mono"
                />
              </label>
            </>
          )}

          {/* Step 3: Taboos */}
          {step === 3 && (
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
                    if (e.key === "Enter") { e.preventDefault(); addTaboo(); }
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

          {/* Step 4: Channels */}
          {step === 4 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">
                Where does this brand publish?
              </h2>
              <p className="text-sm text-slate-muted mb-6">
                Select all that apply. Instagram and Facebook are live now;
                more channels unlock soon.
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
                        {!c.available ? "Soon" : selected ? "On" : "Off"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <>
              <h2 className="font-display text-2xl text-slate-ink mb-1">Review</h2>
              <p className="text-sm text-slate-muted mb-6">
                Make sure this looks right. You&apos;ll be able to edit everything
                from the Strategy view.
              </p>
              <div className="space-y-4 text-sm">
                <ReviewRow label="Name" value={name} />
                {logoPreview && (
                  <ReviewRow
                    label="Logo"
                    value={
                      <Image
                        src={logoPreview}
                        alt="Logo"
                        width={56}
                        height={56}
                        className="w-14 h-14 object-contain rounded border border-slate-line bg-white"
                        unoptimized
                      />
                    }
                  />
                )}
                <ReviewRow
                  label="Website"
                  value={websiteUrl || <span className="text-slate-muted">—</span>}
                />
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
                {referenceUrls.length > 0 && (
                  <ReviewRow
                    label="References"
                    value={
                      <div className="space-y-0.5">
                        {referenceUrls.map((u) => (
                          <div key={u} className="text-xs text-slate-muted truncate">{u}</div>
                        ))}
                      </div>
                    }
                  />
                )}
                <ReviewRow
                  label="Voice"
                  value={
                    <span className="text-slate-muted italic line-clamp-3">
                      {voiceGuide || "Will be drafted by AI research"}
                    </span>
                  }
                />
                {pasteContext.trim() && (
                  <ReviewRow
                    label="Paste"
                    value={
                      <span className="text-slate-muted italic line-clamp-2">
                        {pasteContext.slice(0, 140)}
                        {pasteContext.length > 140 ? "…" : ""} · Claude will parse after create
                      </span>
                    }
                  />
                )}
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
