"use client";

import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { updateChannels } from "@/app/actions/brand";
import { cn } from "@/lib/utils";

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

export function ChannelsEditor({
  brandId,
  initial,
}: {
  brandId: string;
  initial: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string[]>(initial);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setValue((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id]
    );
  }

  function save() {
    startTransition(async () => {
      await updateChannels(brandId, value);
      setEditing(false);
    });
  }

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            CHANNELS
          </div>
          <p className="text-sm text-slate-muted mt-0.5">
            Where this brand publishes. Generation respects per-channel formats.
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
      </div>

      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => {
          const selected = value.includes(c.id);
          if (!editing && !selected && c.available) {
            return null;
          }
          if (!editing && !selected) return null;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!editing || !c.available}
              onClick={() => toggle(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                selected
                  ? "border-evergreen-500 bg-evergreen-50 text-evergreen-700"
                  : "border-slate-line text-slate-ink hover:bg-slate-bg",
                editing && !c.available && "opacity-40 cursor-not-allowed"
              )}
            >
              {c.label}
              {!c.available && editing && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-muted">
                  soon
                </span>
              )}
            </button>
          );
        })}
        {value.length === 0 && !editing && (
          <span className="text-xs text-slate-muted italic">None yet.</span>
        )}
      </div>
    </section>
  );
}
