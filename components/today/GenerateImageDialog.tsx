"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  X,
  Settings2,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  ImagePlus,
  Info,
  FastForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DialogCreativeAsset = {
  id: string;
  url: string;
  caption: string | null;
  tags: string[];
  suggested: boolean;
  suggestionReason: string | null;
};

export type ImageSettings = {
  model: "gpt-image-1.5" | "gpt-image-1" | "dall-e-3";
  quality: "low" | "medium" | "high" | "auto";
  size: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  background: "auto" | "transparent" | "opaque";
  output_format: "png" | "jpeg" | "webp";
  input_fidelity: "low" | "high";
  n: number;
};

export type ImagePrep = {
  prompt: string;
  channel: string;
  settings: ImageSettings;
  logoUrl: string | null;
  includeLogoByDefault: boolean;
  creativeAssets: DialogCreativeAsset[];
  meta: {
    pillarName: string | null;
    pillarColor: string | null;
    angleTitle: string | null;
    brandName: string;
    voiceGuide: string | null;
    primaryColor: string;
  };
  planNotes: string;
};

export type GeneratedResult = {
  mediaAssetId: string;
  url: string;
  prompt: string;
  modelUsed: string;
  settingsUsed: ImageSettings;
  referencesUsed: string[];
};

export function GenerateImageDialog({
  pieceId,
  onClose,
  onGenerated,
}: {
  pieceId: string;
  onClose: () => void;
  onGenerated: (result: GeneratedResult) => void;
}) {
  const [prep, setPrep] = useState<ImagePrep | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Editable state
  const [prompt, setPrompt] = useState("");
  const [includeLogo, setIncludeLogo] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<ImageSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/content/${pieceId}/generate-image`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({ error: "Failed to load" }));
          throw new Error(j.error ?? "Failed to load");
        }
        const data = (await res.json()) as ImagePrep;
        if (cancelled) return;
        setPrep(data);
        setPrompt(data.prompt);
        setIncludeLogo(data.includeLogoByDefault);
        setSettings(data.settings);
        const initialSelected = new Set(
          data.creativeAssets.filter((a) => a.suggested).map((a) => a.id)
        );
        setSelectedIds(initialSelected);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pieceId]);

  const toggleAsset = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function runGenerate() {
    if (!prep || !settings) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/content/${pieceId}/generate-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          referenceAssetIds: Array.from(selectedIds),
          includeLogo,
          settings,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(j.error ?? "Generation failed");
      }
      const data = (await res.json()) as GeneratedResult;
      onGenerated(data);
      onClose();
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Generation failed"
      );
    } finally {
      setGenerating(false);
    }
  }

  const refCount = selectedIds.size + (includeLogo && prep?.logoUrl ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-ink/50 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-line bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-line gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted font-bold">
              IMAGE · PREP & GENERATE
            </div>
            <h2 className="font-display text-lg text-slate-ink mt-0.5">
              Prepare image for this post
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={runGenerate}
              disabled={!prep || generating || prompt.trim().length < 10}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line bg-white text-slate-muted hover:text-white hover:bg-evergreen-600 hover:border-evergreen-600 hover:shadow-sm disabled:opacity-40 text-[11px] font-semibold px-2.5 py-1.5 transition"
              title="Skip editing and generate with the drafted prompt + suggested refs"
            >
              <FastForward className="w-3 h-3" />
              Skip — generate now
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-muted hover:text-slate-ink p-1 rounded"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
          {loadError && (
            <div className="rounded-lg border border-red-100 bg-red-50 text-red-700 text-xs px-3 py-2">
              {loadError}
            </div>
          )}

          {!prep && !loadError && (
            <div className="flex items-center gap-2 text-sm text-slate-muted py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Drafting the prompt and picking creative assets…
            </div>
          )}

          {prep && settings && (
            <>
              {/* Plan notes */}
              {prep.planNotes && (
                <div className="rounded-lg bg-evergreen-50/60 border border-evergreen-100 px-3 py-2 text-[12px] text-evergreen-800 leading-relaxed flex gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[9px]">
                      Plan ·{" "}
                    </span>
                    {prep.planNotes}
                  </div>
                </div>
              )}

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-muted">
                <span className="bg-slate-bg px-2 py-0.5 rounded">
                  {prep.meta.brandName}
                </span>
                {prep.meta.pillarName && (
                  <span
                    className="text-white px-2 py-0.5 rounded"
                    style={{
                      background: prep.meta.pillarColor ?? "#44546C",
                    }}
                  >
                    {prep.meta.pillarName}
                  </span>
                )}
                {prep.meta.angleTitle && (
                  <span className="bg-slate-bg px-2 py-0.5 rounded truncate max-w-[280px]">
                    {prep.meta.angleTitle}
                  </span>
                )}
                <span className="bg-slate-bg px-2 py-0.5 rounded uppercase">
                  {prep.channel}
                </span>
                <span className="bg-slate-bg px-2 py-0.5 rounded">
                  {settings.size}
                </span>
              </div>

              {/* Prompt editor */}
              <div>
                <label className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1.5">
                    Prompt (edit freely)
                  </span>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-slate-line px-3 py-2.5 text-[13px] leading-relaxed text-slate-ink outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-y font-mono"
                  />
                </label>
                <div className="text-[11px] text-slate-muted mt-1">
                  {prompt.length} chars
                </div>
              </div>

              {/* Brand references */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold">
                    Reference images for the generator
                  </div>
                  <div className="text-[11px] text-slate-muted">
                    {refCount === 0
                      ? "None selected (text-only generation)"
                      : `${refCount} reference${refCount === 1 ? "" : "s"} will be sent`}
                  </div>
                </div>

                {/* Logo toggle */}
                {prep.logoUrl && (
                  <label className="flex items-center gap-3 rounded-lg border border-slate-line px-3 py-2 cursor-pointer hover:bg-slate-bg/50 mb-2">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      className="accent-evergreen-500"
                    />
                    <div className="w-10 h-10 rounded border border-slate-line bg-white flex items-center justify-center overflow-hidden">
                      <Image
                        src={prep.logoUrl}
                        alt="Brand logo"
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-ink">
                        Brand logo
                      </div>
                      <div className="text-[11px] text-slate-muted">
                        Hand the logo to the generator as a visual anchor.
                      </div>
                    </div>
                  </label>
                )}

                {prep.creativeAssets.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-line px-3 py-4 text-[11px] text-slate-muted text-center">
                    No creative assets yet. Upload some on the Brand page to
                    see them suggested here.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {prep.creativeAssets.map((a) => {
                      const selected = selectedIds.has(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAsset(a.id)}
                          className={cn(
                            "group relative rounded-lg overflow-hidden border-2 text-left transition",
                            selected
                              ? "border-evergreen-500 ring-2 ring-evergreen-100"
                              : "border-slate-line hover:border-evergreen-300"
                          )}
                          title={a.suggestionReason ?? a.caption ?? ""}
                        >
                          <div className="aspect-square bg-slate-bg">
                            <Image
                              src={a.url}
                              alt={a.caption ?? "Creative asset"}
                              width={160}
                              height={160}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                          {selected && (
                            <div className="absolute top-1 right-1 bg-evergreen-500 text-white rounded-full p-0.5">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          {a.suggested && !selected && (
                            <div className="absolute top-1 right-1 bg-evergreen-500/20 text-evergreen-700 text-[8px] font-mono font-bold uppercase tracking-wider px-1 py-0.5 rounded">
                              suggested
                            </div>
                          )}
                          {a.suggestionReason && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[9px] px-1.5 py-1 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                              {a.suggestionReason}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dev settings */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowSettings((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold hover:text-slate-ink transition"
                >
                  <Settings2 className="w-3 h-3" />
                  Generator settings (dev)
                  {showSettings ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {showSettings && (
                  <SettingsPanel
                    settings={settings}
                    onChange={setSettings}
                  />
                )}
              </div>
            </>
          )}

          {generateError && (
            <div className="rounded-lg border border-red-100 bg-red-50 text-red-700 text-xs px-3 py-2">
              <span className="font-bold uppercase tracking-wider text-[9px]">
                Error ·{" "}
              </span>
              {generateError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-line bg-slate-bg/30">
          <div className="text-[11px] text-slate-muted">
            {settings?.model} · {settings?.quality} · {settings?.size}
            {refCount > 0 && ` · ${refCount} refs`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-line text-slate-muted hover:bg-slate-bg text-xs font-semibold px-3 py-2 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runGenerate}
              disabled={!prep || generating || prompt.trim().length < 10}
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 transition"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <ImagePlus className="w-3.5 h-3.5" />
                  Generate image
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen spinner while generating so user knows something's happening */}
      {generating && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-white border border-slate-line rounded-full px-4 py-2 shadow-lg inline-flex items-center gap-2 text-xs font-semibold text-evergreen-700">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            OpenAI is painting — this can take 30-90s.
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: ImageSettings;
  onChange: (next: ImageSettings) => void;
}) {
  function set<K extends keyof ImageSettings>(
    key: K,
    value: ImageSettings[K]
  ) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 rounded-lg border border-slate-line bg-white p-3">
      <SelectField
        label="Model"
        value={settings.model}
        onChange={(v) => set("model", v as ImageSettings["model"])}
        options={["gpt-image-1.5", "gpt-image-1", "dall-e-3"]}
      />
      <SelectField
        label="Quality"
        value={settings.quality}
        onChange={(v) => set("quality", v as ImageSettings["quality"])}
        options={["low", "medium", "high", "auto"]}
      />
      <SelectField
        label="Size"
        value={settings.size}
        onChange={(v) => set("size", v as ImageSettings["size"])}
        options={["1024x1024", "1536x1024", "1024x1536", "auto"]}
      />
      <SelectField
        label="Background"
        value={settings.background}
        onChange={(v) =>
          set("background", v as ImageSettings["background"])
        }
        options={["auto", "transparent", "opaque"]}
      />
      <SelectField
        label="Output format"
        value={settings.output_format}
        onChange={(v) =>
          set("output_format", v as ImageSettings["output_format"])
        }
        options={["png", "jpeg", "webp"]}
      />
      <SelectField
        label="Input fidelity"
        value={settings.input_fidelity}
        onChange={(v) =>
          set("input_fidelity", v as ImageSettings["input_fidelity"])
        }
        options={["low", "high"]}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-muted font-bold mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-line px-2 py-1.5 text-[11px] font-mono outline-none focus:border-evergreen-500 bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
