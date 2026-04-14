import { put, del } from "@vercel/blob";

export type UploadedBlob = {
  url: string;
  pathname: string;
  contentType: string | null;
  size: number;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25 MB

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

export function isImage(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  return contentType.startsWith("image/");
}

export function classifyKind(
  contentType: string | null | undefined
): "image" | "doc" | "video" {
  if (!contentType) return "doc";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  return "doc";
}

export async function uploadFile(
  file: File,
  pathPrefix: string
): Promise<UploadedBlob> {
  const kind = classifyKind(file.type);
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (file.size > limit) {
    throw new Error(
      `File too large (${Math.round(file.size / 1024 / 1024)}MB, max ${Math.round(
        limit / 1024 / 1024
      )}MB)`
    );
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "upload";

  const pathname = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type || null,
    size: file.size,
  };
}

export async function deleteBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    console.warn("deleteBlob failed (non-fatal):", err);
  }
}
