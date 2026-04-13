"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronsUpDown, Plus, Check } from "lucide-react";
import { selectBrand } from "@/app/actions/brand";
import { cn } from "@/lib/utils";

type BrandLite = { id: string; name: string; slug: string };

export function BrandSwitcher({
  current,
  brands,
}: {
  current: BrandLite | null;
  brands: BrandLite[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change (covers intake wizard redirect)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-line bg-slate-bg px-3 py-2.5 hover:bg-slate-line/30 transition"
        aria-expanded={open}
      >
        <div className="text-left min-w-0">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-muted font-semibold">
            Brand
          </div>
          <div className="text-sm font-semibold text-slate-ink truncate">
            {current?.name ?? "No brand selected"}
          </div>
        </div>
        <ChevronsUpDown className="w-4 h-4 text-slate-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-30 rounded-lg border border-slate-line bg-white shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {brands.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-muted">
                No brands yet.
              </div>
            )}
            {brands.map((b) => {
              const isCurrent = b.id === current?.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    startTransition(() => { selectBrand(b.id); });
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-evergreen-50 transition",
                    isCurrent && "bg-evergreen-50"
                  )}
                >
                  <span className="truncate text-slate-ink">{b.name}</span>
                  {isCurrent && (
                    <Check className="w-4 h-4 text-evergreen-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          <Link
            href="/app/brands/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-evergreen-600 hover:bg-evergreen-50 border-t border-slate-line font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            New brand
          </Link>
        </div>
      )}
    </div>
  );
}
