import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { scrapeUrl } from "@/lib/research/scraper";

const inferResultSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
  voiceGuide: z.string().max(1200),
  tabooWords: z.array(z.string()).max(16),
  suggestedChannels: z.array(z.string()).max(6).default([]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export type InferResult = z.infer<typeof inferResultSchema>;

const INFER_TOOL = {
  name: "propose_brand",
  description:
    "Propose a brand intake pre-fill from the scraped website content. " +
    "Fill every field using only what is clearly implied by the page — " +
    "keep it short and editable. Do not fabricate facts.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description:
          "The brand or business name as it appears on the site. Strip taglines.",
      },
      description: {
        type: "string",
        description:
          "One sentence describing what this brand does, as a hint for the user.",
      },
      voiceGuide: {
        type: "string",
        description:
          "2-4 sentences describing the brand's voice inferred from the page: tone, attitude, register, typical moves. Actionable guidance, not marketing copy.",
      },
      tabooWords: {
        type: "array",
        items: { type: "string" },
        description:
          "Words or phrases this brand would likely NEVER use. 0-8 items. Be conservative; leave empty if unclear.",
      },
      suggestedChannels: {
        type: "array",
        items: { type: "string" },
        description:
          "Which of [instagram, facebook, tiktok, linkedin, x, threads, youtube, pinterest] the brand appears to use, based on links / mentions on the page. Only include ones you see evidence for.",
      },
      primaryColor: {
        type: "string",
        description:
          "A hex color like #4EB35E that represents the brand. Prefer a distinctive accent over black/white. If truly unclear, propose #4EB35E.",
      },
    },
    required: [
      "name",
      "voiceGuide",
      "tabooWords",
      "suggestedChannels",
      "primaryColor",
    ],
  },
};

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = normalizeUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json(
      { error: "Please enter a valid website URL." },
      { status: 400 }
    );
  }

  const scrape = await scrapeUrl(url);
  if (!scrape.text || scrape.text.length < 80) {
    return NextResponse.json(
      {
        error:
          "We couldn't read enough from that page. You can still set up the brand manually.",
        url,
      },
      { status: 422 }
    );
  }

  const system = [
    "You are onboarding a new brand into Evergreen Studio.",
    "The user has provided a single website URL. Your job is to propose",
    "starter values for brand intake based strictly on what the page says.",
    "Be conservative: if a field isn't clearly supported, give a minimal",
    "safe default rather than inventing content.",
    "",
    "Return your answer via the `propose_brand` tool — not as prose.",
  ].join("\n");

  const userMsg = [
    `Website URL: ${url}`,
    scrape.title ? `Page title: ${scrape.title}` : "",
    "",
    "Scraped page text (truncated):",
    scrape.text.slice(0, 6000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [INFER_TOOL],
      tool_choice: { type: "tool", name: "propose_brand" },
      system,
      messages: [{ role: "user", content: userMsg }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "Inference failed. Please try again or set up manually." },
        { status: 502 }
      );
    }

    const parsed = inferResultSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Inference returned invalid data. Please set up manually." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      url,
      title: scrape.title,
      scraperPath: scrape.path,
      result: parsed.data,
    });
  } catch (err) {
    console.error("Brand inference error:", err);
    const message = err instanceof Error ? err.message : "Inference failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
