"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { updateTaboos } from "@/app/actions/strategy";

export function TabooWordsEditor({
  brandId,
  initial,
}: {
  brandId: string;
  initial: string[];
}) {
  const [taboos, setTaboos] = useState(initial);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  function persist(next: string[]) {
    setTaboos(next);
    startTransition(() => updateTaboos(brandId, next));
  }

  function add() {
    const v = input.trim().toLowerCase();
    if (v && !taboos.includes(v)) {
      persist([...taboos, v]);
    }
    setInput("");
  }

  function remove(word: string) {
    persist(taboos.filter((t) => t !== word));
  }

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-3">
        TABOO WORDS · NEVER GENERATE
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {taboos.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => remove(t)}
            disabled={pending}
            className="group inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-red-100 transition"
          >
            {t}
            <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
          </button>
        ))}

        {taboos.length === 0 && (
          <span className="text-xs text-slate-muted italic">
            No taboos yet. Add words the AI should never use.
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a taboo word…"
          className="flex-1 rounded-lg border border-slate-line px-3 py-2 text-xs outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim() || pending}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-line px-3 py-2 text-xs font-semibold hover:bg-slate-bg disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </section>
  );
}
