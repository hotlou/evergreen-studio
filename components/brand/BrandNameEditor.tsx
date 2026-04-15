"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { updateBrandName } from "@/app/actions/brand";

export function BrandNameEditor({
  brandId,
  initial,
}: {
  brandId: string;
  initial: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function cancel() {
    setValue(initial);
    setError(null);
    setEditing(false);
  }

  function save() {
    const clean = value.trim();
    if (!clean) {
      setError("Name required");
      return;
    }
    if (clean === initial) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateBrandName(brandId, clean);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <h1
          className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight cursor-text"
          onClick={() => setEditing(true)}
          title="Click to rename"
        >
          {initial}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-slate-muted hover:text-evergreen-600"
          title="Rename brand"
        >
          <Pencil className="w-3.5 h-3.5" />
          Rename
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={80}
          disabled={pending}
          className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight bg-white border border-slate-line rounded-lg px-3 py-1 outline-none focus:border-evergreen-500 focus:ring-2 focus:ring-evergreen-100 min-w-0 flex-1 max-w-xl disabled:opacity-50"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 transition"
        >
          <Check className="w-3.5 h-3.5" />
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-line text-slate-muted hover:bg-slate-bg text-xs font-semibold px-3 py-2 transition disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
