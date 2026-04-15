"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Check } from "lucide-react";
import { removeBrandLogo } from "@/app/actions/brand";

export function LogoUploader({
  brandId,
  logoUrl,
  primaryColor,
}: {
  brandId: string;
  logoUrl: string | null;
  primaryColor: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setJustUploaded(false);
    try {
      const form = new FormData();
      form.append("brandId", brandId);
      form.append("file", file);
      const res = await fetch("/api/brand/logo", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(j.error ?? "Upload failed");
      }
      setJustUploaded(true);
      router.refresh();
      setTimeout(() => setJustUploaded(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    startTransition(async () => {
      await removeBrandLogo(brandId);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-slate-line bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
            BRAND LOGO
          </div>
          <p className="text-sm text-slate-muted mt-0.5">
            Used in generation prompts and social publishing.
          </p>
        </div>
        {justUploaded && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-evergreen-600 uppercase tracking-wider">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div
          className="w-28 h-28 rounded-xl border border-slate-line flex items-center justify-center overflow-hidden"
          style={{ background: logoUrl ? "#ffffff" : `${primaryColor}14` }}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Brand logo"
              width={112}
              height={112}
              className="w-full h-full object-contain"
              unoptimized
            />
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-muted">
              No logo
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading || pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-xs px-3 py-2 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading || pending}
              className="inline-flex items-center gap-1.5 text-xs text-slate-muted hover:text-red-600 px-1 py-1 transition"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          )}
          <p className="text-[11px] text-slate-muted max-w-[220px]">
            PNG, JPG, WebP, or SVG. 10 MB max.
          </p>
          {error && (
            <p className="text-[11px] text-red-600 font-semibold">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
