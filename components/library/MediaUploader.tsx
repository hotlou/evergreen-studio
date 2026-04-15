"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

export function MediaUploader({
  brandId,
  purpose,
  accept,
  label,
  helpText,
}: {
  brandId: string;
  purpose?: "creative";
  accept?: string;
  label?: string;
  helpText?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setSuccessMsg(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("brandId", brandId);
      if (purpose) form.append("purpose", purpose);
      for (const f of Array.from(files)) {
        form.append("files", f);
      }
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(j.error ?? "Upload failed");
      }
      const data = await res.json();
      const count = (data.assetIds ?? []).length;
      const rejected = (data.rejected ?? []).length;
      setSuccessMsg(
        `Uploaded ${count} file${count === 1 ? "" : "s"}${
          rejected > 0 ? ` · ${rejected} rejected` : ""
        }. Tags are being generated…`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length > 0) {
          uploadFiles(e.dataTransfer.files);
        }
      }}
      className={`rounded-xl border-2 border-dashed px-5 py-6 text-center transition ${
        dragging
          ? "border-evergreen-500 bg-evergreen-50"
          : "border-slate-line bg-white"
      }`}
    >
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={
          accept ??
          "image/*,application/pdf,.doc,.docx,text/plain,text/markdown,video/mp4"
        }
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      <div className="flex items-center justify-center gap-3 mb-2">
        {uploading ? (
          <Loader2 className="w-5 h-5 text-evergreen-600 animate-spin" />
        ) : (
          <Upload className="w-5 h-5 text-slate-muted" />
        )}
        <p className="text-sm text-slate-ink font-semibold">
          {uploading
            ? "Uploading…"
            : label ?? "Drop images, PDFs, or docs here — or click to choose"}
        </p>
      </div>
      <p className="text-[11px] text-slate-muted">
        {helpText ??
          "Images are auto-tagged by Claude vision. Max 10 MB image, 25 MB doc."}
      </p>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 disabled:opacity-50 text-white font-semibold text-xs px-3 py-2 transition"
      >
        <Upload className="w-3.5 h-3.5" />
        Choose files
      </button>

      {successMsg && (
        <div className="mt-3 text-[11px] text-evergreen-700 font-semibold">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mt-3 text-[11px] text-red-700 font-semibold">{error}</div>
      )}
    </div>
  );
}
