import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { createHash } from "crypto";
import type { Brand, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scrapeUrl, scrapeUrls, type ScrapeResult } from "./scraper";
import {
  buildResearchPrompt,
  PROPOSE_STRATEGY_TOOL,
  researchResultSchema,
  type ResearchResult,
} from "./prompts";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Cache helpers ────────────────────────────────────────────

export function computeUrlHash(brand: Brand): string {
  const parts = [
    brand.websiteUrl ?? "",
    ...brand.referenceUrls.slice().sort(),
  ].join(",");
  return createHash("sha256").update(parts).digest("hex");
}

function isCacheValid(brand: Brand, hash: string): boolean {
  if (!brand.lastResearchResult) return false;
  if (!brand.lastResearchAt) return false;
  if (brand.lastResearchUrlHash !== hash) return false;
  return Date.now() - brand.lastResearchAt.getTime() < CACHE_TTL_MS;
}

// ── Main pipeline ────────────────────────────────────────────

export async function researchBrand(
  brand: Brand,
  bypassCache = false
): Promise<{ result: ResearchResult; cached: boolean; scraperPaths: string[] }> {
  const hash = computeUrlHash(brand);

  // Return cache if valid and not bypassed
  if (!bypassCache && isCacheValid(brand, hash)) {
    const cached = researchResultSchema.parse(brand.lastResearchResult);
    return { result: cached, cached: true, scraperPaths: [] };
  }

  // Scrape
  const scraperPaths: string[] = [];
  let websiteScrape: ScrapeResult = {
    url: "",
    title: "",
    text: "",
    path: "failed",
  };

  if (brand.websiteUrl) {
    websiteScrape = await scrapeUrl(brand.websiteUrl);
    scraperPaths.push(`website:${websiteScrape.path}`);
  }

  let refScrapes: ScrapeResult[] = [];
  if (brand.referenceUrls.length > 0) {
    refScrapes = await scrapeUrls(brand.referenceUrls);
    for (const r of refScrapes) {
      scraperPaths.push(`ref:${r.path}`);
    }
  }

  // Log ingest job
  const bestPath = websiteScrape.path !== "failed"
    ? websiteScrape.path
    : refScrapes.find((r) => r.path !== "failed")?.path ?? "failed";

  await prisma.ingestJob.create({
    data: {
      brandId: brand.id,
      source: "research",
      status: "running",
      scraperPath: bestPath,
      rawStats: {
        websiteChars: websiteScrape.text.length,
        refCount: refScrapes.length,
        refChars: refScrapes.reduce((s, r) => s + r.text.length, 0),
        scraperPaths,
      },
    },
  });

  // Build prompt
  const { system, user } = buildResearchPrompt({
    brandName: brand.name,
    websiteText: websiteScrape.text,
    websiteTitle: websiteScrape.title,
    referenceTexts: refScrapes
      .filter((r) => r.text.length > 0)
      .map((r) => ({ url: r.url, text: r.text })),
    existingVoice: brand.voiceGuide ?? undefined,
    existingTaboos: brand.taboosList.length > 0 ? brand.taboosList : undefined,
  });

  // Call Claude with tool-use
  const anthropic = new Anthropic();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cache_control not in SDK types yet
  const systemBlock: any = {
    type: "text",
    text: system,
    cache_control: { type: "ephemeral" },
  };

  // Web search tool (server-side, executed by Anthropic)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web_search tool not in SDK types
  const webSearchTool: any = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 5,
  };

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    system: [systemBlock],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed tool types
    tools: [webSearchTool, PROPOSE_STRATEGY_TOOL] as any,
    // Don't force tool_choice — let Claude search first, then call propose_strategy
    messages: [{ role: "user", content: user }],
  });

  // Extract result from tool-use response (find the propose_strategy call)
  const toolBlock = response.content.find(
    (b) => b.type === "tool_use" && b.name === "propose_strategy"
  );
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude did not return a propose_strategy tool call");
  }

  const raw = toolBlock.input as Record<string, unknown>;

  // Validate with Zod
  const result = researchResultSchema.parse(raw);

  // Cache on brand
  await prisma.brand.update({
    where: { id: brand.id },
    data: {
      lastResearchResult: result as unknown as Prisma.InputJsonValue,
      lastResearchAt: new Date(),
      lastResearchUrlHash: hash,
    },
  });

  // Update ingest job status
  await prisma.ingestJob.updateMany({
    where: { brandId: brand.id, source: "research", status: "running" },
    data: { status: "complete", minedPillarSuggestions: result as unknown as Prisma.InputJsonValue },
  });

  return { result, cached: false, scraperPaths };
}
