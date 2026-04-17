"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { deleteBrandAction } from "@/app/actions/brand";

const CONFIRM_PHRASE = "DELETE BRAND";

export function DeleteBrandPanel({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const matches = confirmation === CONFIRM_PHRASE;

  function handleDelete() {
    setError(null);
    start(async () => {
      try {
        await deleteBrandAction(brandId, confirmation);
      } catch (err) {
        // NEXT_REDIRECT bubbles as an error — let it propagate
        if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
        if (err && typeof err === "object" && "digest" in err) {
          const digest = (err as { digest?: string }).digest;
          if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
            throw err;
          }
        }
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/40 p-5">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-red-700 font-bold">
            DANGER ZONE
          </div>
          <h2 className="font-display text-lg text-slate-ink">Delete brand</h2>
          <p className="text-sm text-slate-muted mt-1">
            Permanently remove <span className="font-semibold">{brandName}</span>{" "}
            and everything it owns: pillars, angles, drafts, approved content,
            uploaded assets, learnings, and publish history. This cannot be
            undone.
          </p>
        </div>
      </div>

      {!open ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50 font-semibold text-xs px-3 py-2 transition"
          >
            Delete this brand…
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-red-200 p-4 space-y-3">
          <div className="text-sm text-slate-ink">
            This action is{" "}
            <span className="font-semibold text-red-700">not reversible</span>.
            Type{" "}
            <code className="rounded bg-slate-bg border border-slate-line px-1.5 py-0.5 font-mono text-[12px]">
              {CONFIRM_PHRASE}
            </code>{" "}
            to confirm.
          </div>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoFocus
            className="w-full rounded-lg border border-slate-line px-3 py-2 text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          {error && (
            <div className="rounded border border-red-100 bg-red-50 text-red-700 text-xs px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmation("");
                setError(null);
              }}
              disabled={pending}
              className="text-xs text-slate-muted hover:text-slate-ink font-semibold px-3 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!matches || pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold text-xs px-4 py-2 transition"
            >
              {pending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>Delete {brandName} permanently</>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
