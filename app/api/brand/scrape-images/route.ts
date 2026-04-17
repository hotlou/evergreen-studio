import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enrichMediaAsset } from "@/lib/media/vision";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CANDIDATES = 30;
const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; EvergreenStudio/1.0; +https://studio.evergreen.app)";

async function requireBrand(brandId: string, userId: string) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { workspace: { include: { memberships: true } } },
  });
  if (!brand) throw new Error("Brand not found");
  if (!brand.workspace.memberships.some((m) => m.userId === userId)) {
    throw new Error("Access denied");
  }
  return brand;
}

// ── GET: list image candidates from the brand's websiteUrl ────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") ?? "";
  const overrideUrl = searchParams.get("url") ?? "";
  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }

  let brand;
  try {
    brand = await requireBrand(brandId, session.user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Brand error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const startUrl = overrideUrl || brand.websiteUrl;
  if (!startUrl) {
    return NextResponse.json(
      { error: "This brand doesn't have a website URL set yet." },
      { status: 422 }
    );
  }

  let html = "";
  let baseUrl = startUrl;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(startUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    clearTimeout(timer);
    baseUrl = res.url || startUrl;
    if (!res.ok) {
      return NextResponse.json(
        { error: `Couldn't fetch site (${res.status})` },
        { status: 502 }
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the site. Try again or upload manually." },
      { status: 502 }
    );
  }

  const candidates = extractImageCandidates(html, baseUrl);
  return NextResponse.json({
    sourceUrl: baseUrl,
    candidates: candidates.slice(0, MAX_CANDIDATES),
  });
}

// ── POST: import selected URLs as creative-asset MediaAsset rows ──

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    brandId?: string;
    urls?: string[];
  };
  const brandId = body.brandId ?? "";
  const urls = (body.urls ?? []).filter(
    (u): u is string => typeof u === "string" && u.length > 0
  );
  if (!brandId || urls.length === 0) {
    return NextResponse.json(
      { error: "brandId and at least one url required" },
      { status: 400 }
    );
  }

  try {
    await requireBrand(brandId, session.user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Brand error";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const imported: string[] = [];
  const failed: { url: string; reason: string }[] = [];

  for (const url of urls.slice(0, 30)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      clearTimeout(timer);
      if (!res.ok) {
        failed.push({ url, reason: `fetch ${res.status}` });
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) {
        failed.push({ url, reason: "not an image" });
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 2_000) {
        failed.push({ url, reason: "too small" });
        continue;
      }
      if (buffer.length > 10 * 1024 * 1024) {
        failed.push({ url, reason: "too large" });
        continue;
      }

      const ext = guessExtension(url, contentType);
      const safeName = `web-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const pathname = `brands/${brandId}/uploads/${safeName}`;
      const blob = await put(pathname, buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType,
      });

      const asset = await prisma.mediaAsset.create({
        data: {
          brandId,
          kind: "image",
          source: "uploaded",
          url: blob.url,
          caption: `Imported from ${new URL(url).hostname}`,
          tags: ["image", "creative-asset", "from-website"],
        },
      });
      imported.push(asset.id);

      // Fire-and-forget vision tagging
      enrichMediaAsset(asset.id).catch((err) =>
        console.error("vision tag failed:", err)
      );
    } catch (err) {
      failed.push({
        url,
        reason: err instanceof Error ? err.message : "import failed",
      });
    }
  }

  revalidatePath("/app/brand");
  revalidatePath("/app/library");
  return NextResponse.json({ imported, failed });
}

// ── Helpers ───────────────────────────────────────────────────

type Candidate = { url: string; alt: string | null; source: string };

function extractImageCandidates(html: string, baseUrl: string): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];

  function push(rawSrc: string, alt: string | null, source: string) {
    const resolved = resolveUrl(rawSrc, baseUrl);
    if (!resolved) return;
    if (!isLikelyContentImage(resolved)) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);
    out.push({ url: resolved, alt, source });
  }

  // og:image / twitter:image (highest signal)
  for (const m of html.matchAll(
    /<meta\s+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']\s+content=["']([^"']+)["']/gi
  )) {
    push(m[1], null, "meta");
  }
  for (const m of html.matchAll(
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/gi
  )) {
    push(m[1], null, "meta");
  }

  // <img src> tags with optional alt
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1];
    const src =
      /\bsrc=["']([^"']+)["']/i.exec(attrs)?.[1] ??
      /\bdata-src=["']([^"']+)["']/i.exec(attrs)?.[1] ??
      "";
    if (!src) continue;
    const alt = /\balt=["']([^"']*)["']/i.exec(attrs)?.[1] ?? null;
    push(src, alt, "img");
  }

  // <source srcset> inside <picture>
  for (const m of html.matchAll(
    /<source\b[^>]*\bsrcset=["']([^"']+)["']/gi
  )) {
    const first = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (first) push(first, null, "picture");
  }

  return out;
}

function resolveUrl(src: string, base: string): string | null {
  try {
    const trimmed = src.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("data:")) return null;
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
}

function isLikelyContentImage(url: string): boolean {
  const lower = url.toLowerCase();
  // Skip tracking pixels, icons, sprites, etc.
  if (lower.endsWith(".ico")) return false;
  if (lower.includes("favicon")) return false;
  if (lower.includes("apple-touch-icon")) return false;
  if (lower.includes("/sprite") || lower.endsWith("sprite.svg")) return false;
  if (/[?&](w|width|h|height)=1\b/.test(lower)) return false;
  if (/\b1x1\b/.test(lower)) return false;
  if (/[?&]pixel\b/.test(lower)) return false;
  if (lower.includes("/tracking/") || lower.includes("/pixel/")) return false;
  // Allow common image extensions and unknowns (CDN URLs often hide ext)
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/.test(lower)) return true;
  // SVG: keep only if it doesn't smell like an icon
  if (lower.endsWith(".svg")) {
    return !/(icon|logo-mark|chevron|arrow|caret|nav-)/.test(lower);
  }
  // No extension — keep; many CDN URLs are bare
  return true;
}

function guessExtension(url: string, contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const m = /\.(png|jpe?g|webp|gif|avif|svg)(?:\?|$)/i.exec(url);
  if (m) return m[1].toLowerCase().replace("jpeg", "jpg");
  return "jpg";
}
