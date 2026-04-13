export type ScrapeResult = {
  url: string;
  title: string;
  text: string;
  path: "direct" | "jina" | "failed";
};

const TIMEOUT_MS = 8_000;
const MIN_DIRECT_CHARS = 500;
const MAX_TEXT_CHARS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; EvergreenStudio/1.0; +https://studio.evergreen.app)";

/**
 * Fetch a URL and extract readable text. Falls back to Jina Reader
 * if direct extraction yields < 500 chars.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // Try direct fetch + regex extraction first
  const direct = await directScrape(url);
  if (direct.text.length >= MIN_DIRECT_CHARS) {
    return { ...direct, path: "direct" };
  }

  // Fallback: Jina Reader
  const jina = await jinaScrape(url);
  if (jina.text.length > 0) {
    return { ...jina, path: "jina" };
  }

  // Both failed — return whatever direct gave us (possibly empty)
  return { url, title: direct.title || url, text: direct.text, path: "failed" };
}

/**
 * Scrape multiple URLs in parallel. Returns results in the same order,
 * with failed URLs producing empty text.
 */
export async function scrapeUrls(urls: string[]): Promise<ScrapeResult[]> {
  return Promise.all(urls.slice(0, 6).map(scrapeUrl));
}

// ── Direct fetch + regex extraction ──────────────────────────

async function directScrape(
  url: string
): Promise<{ url: string; title: string; text: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) return { url, title: "", text: "" };

    const html = await res.text();
    const title = extractTitle(html);
    const text = extractText(html);
    return { url, title, text: text.slice(0, MAX_TEXT_CHARS) };
  } catch {
    return { url, title: "", text: "" };
  }
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function extractText(html: string): string {
  let s = html;
  // Remove tags that are noise
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  // Extract meta description
  const metaDesc =
    s.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    "";
  // Strip all remaining tags
  s = s.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  s = s.replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ").replace(/&\w+;/g, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  // Prepend meta description if it adds info
  if (metaDesc && !s.startsWith(metaDesc)) {
    s = `${metaDesc}\n\n${s}`;
  }
  return s;
}

// ── Jina Reader fallback ─────────────────────────────────────

async function jinaScrape(
  url: string
): Promise<{ url: string; title: string; text: string }> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/plain",
        "User-Agent": USER_AGENT,
      },
    });
    clearTimeout(timer);

    if (!res.ok) return { url, title: "", text: "" };

    const text = await res.text();
    // Jina returns markdown-ish text. Extract title from first line if it's a heading.
    const lines = text.split("\n");
    const title = lines[0]?.startsWith("#")
      ? lines[0].replace(/^#+\s*/, "").trim()
      : "";
    return { url, title, text: text.slice(0, MAX_TEXT_CHARS) };
  } catch {
    return { url, title: "", text: "" };
  }
}
