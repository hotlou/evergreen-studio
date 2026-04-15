"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { IMAGE_STYLES } from "@/lib/brand/image-styles";
import { updateImageStyles } from "@/app/actions/brand";
import { cn } from "@/lib/utils";

export function ImageStylePills({
  brandId,
  initial,
}: {
  brandId: string;
  initial: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await updateImageStyles(brandId, Array.from(selected));
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="flex items-start justify-between mb-1 gap-3 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-evergreen-600" />
            IMAGE STYLE
          </div>
          <p className="text-sm text-slate-muted mt-0.5">
            What kinds of imagery should this brand generate? Pick one or a
            few. The image planner uses these to steer away from generic AI
            illustration.
          </p>
        </div>
        {saved && !dirty && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-evergreen-600 uppercase tracking-wider">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {IMAGE_STYLES.map((s) => {
          const isOn = selected.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              title={s.short}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                isOn
                  ? "border-evergreen-500 bg-evergreen-50 text-evergreen-700"
                  : "border-slate-line text-slate-ink hover:bg-slate-bg hover:border-evergreen-300"
              )}
            >
              {isOn && <Check className="w-3 h-3" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {selected.size === 0 ? (
        <p className="text-[11px] text-slate-muted italic mt-3">
          No styles picked — the planner will choose freely (often defaults to
          illustration). Pick at least one to lock things down.
        </p>
      ) : (
        <p className="text-[11px] text-slate-muted mt-3">
          {selected.size} style{selected.size === 1 ? "" : "s"} on. Generation
          will blend these and stay within them.
        </p>
      )}

      {dirty && (
        <div className="sticky bottom-0 mt-4 -mx-5 -mb-5 px-5 py-3 bg-white border-t border-slate-line flex items-center justify-between rounded-b-xl">
          <span className="text-[11px] text-slate-muted">
            Unsaved changes
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelected(new Set(initial));
                setDirty(false);
              }}
              disabled={pending}
              className="rounded-lg border border-slate-line text-slate-muted hover:bg-slate-bg text-xs font-semibold px-3 py-2 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-60 text-white font-semibold text-xs px-4 py-2 transition"
            >
              <Check className="w-3.5 h-3.5" />
              {pending ? "Saving…" : "Save styles"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
