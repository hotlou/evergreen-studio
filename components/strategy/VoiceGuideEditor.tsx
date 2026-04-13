"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Check } from "lucide-react";
import { updateVoiceGuide } from "@/app/actions/strategy";

export function VoiceGuideEditor({
  brandId,
  initial,
}: {
  brandId: string;
  initial: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Sync from server when initial changes (e.g. after research merge)
  useEffect(() => {
    if (!editing) setValue(initial);
  }, [initial, editing]);

  function save() {
    startTransition(async () => {
      await updateVoiceGuide(brandId, value);
      setEditing(false);
    });
  }

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
          VOICE GUIDE
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

      {editing ? (
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          className="w-full text-[13px] leading-relaxed text-slate-ink border border-slate-line rounded-lg px-3 py-2 outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 resize-none"
        />
      ) : (
        <div className="text-[13px] leading-relaxed text-slate-ink whitespace-pre-wrap">
          {value || (
            <span className="text-slate-muted italic">
              No voice guide yet. Click Edit to add one.
            </span>
          )}
        </div>
      )}

      {value && !editing && (
        <div className="mt-3 px-3 py-2 bg-evergreen-50 border-l-2 border-evergreen-500 rounded-r-lg text-[10px] text-evergreen-800 leading-relaxed">
          <strong>Rule:</strong> If it sounds like a supplement brand, rewrite it.
        </div>
      )}
    </section>
  );
}
