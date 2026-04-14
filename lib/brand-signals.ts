import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/db";
import { scrapeUrls } from "@/lib/research/scraper";

// Extract URLs from arbitrary pasted text
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  const cleaned = matches
    .map((u) => u.replace(/[),.;]+$/g, ""))
    .filter((u) => u.length > 8);
  return Array.from(new Set(cleaned)).slice(0, 6);
}

// ── Zod schema for parsed brand signals ──

export const brandSignalsSchema = z.object({
  summary: z.string().max(600),
  voiceAdditions: z.string().max(4000).default(""),
  taboos: z.array(z.string().min(1).max(80)).max(40).default([]),
  learnings: z
    .array(
      z.object({
        kind: z.enum(["do_this", "dont", "tone", "visual"]),
        text: z.string().min(4).max(280),
      })
    )
    .max(30)
    .default([]),
  colorHints: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .max(8)
    .default([]),
});

export type BrandSignals = z.infer<typeof brandSignalsSchema>;

// ── Anthropic tool definition ──

const EXTRACT_SIGNALS_TOOL: Tool = {
  name: "extract_brand_signals",
  description:
    "Parse arbitrary pasted text (raw notes, press quotes, reviews, competitor copy, " +
    "scraped web pages, etc.) and produce structured brand signals: voice additions, " +
    "taboos to avoid, do/don't learnings, and any hex color hints you can infer.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "2-3 sentence summary of what the pasted material reveals about this brand.",
      },
      voiceAdditions: {
        type: "string",
        description:
          "Additions to merge into the brand's voice guide. Write them as instructions " +
          "to a copywriter. Empty string if nothing to add.",
      },
      taboos: {
        type: "array",
        description:
          "Specific words or phrases the brand should never use, derived from the paste.",
        items: { type: "string" },
      },
      learnings: {
        type: "array",
        description:
          "Distinct learnings — each a single generalizable rule. Pick kind precisely.",
        items: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["do_this", "dont", "tone", "visual"],
              description:
                "do_this = positive patterns; dont = avoid; tone = voice; visual = imagery/format",
            },
            text: {
              type: "string",
              description:
                "A single rule, imperative, under 200 chars. E.g. 'Lead with specific numbers, not adjectives.'",
            },
          },
          required: ["kind", "text"],
        },
      },
      colorHints: {
        type: "array",
        description:
          "Any hex colors explicitly mentioned or strongly implied by the material. 6-digit hex only.",
        items: { type: "string" },
      },
    },
    required: ["summary", "voiceAdditions", "taboos", "learnings", "colorHints"],
  },
};

// ── Parser ──

export async function parseBrandSignals(input: {
  brandName: string;
  pastedText: string;
  attachedDocs?: { name: string; text: string }[];
  existingVoice?: string | null;
  existingTaboos?: string[];
}): Promise<BrandSignals> {
  const urls = extractUrls(input.pastedText);
  const scraped = urls.length > 0 ? await scrapeUrls(urls) : [];

  const textParts: string[] = [
    `# Brand: ${input.brandName}`,
    "",
    "The user has pasted the following arbitrary material. Extract brand signals.",
    "",
    "## Pasted content",
    "```",
    input.pastedText.slice(0, 12_000) || "(empty)",
    "```",
    "",
  ];

  if (scraped.length > 0) {
    textParts.push("## Fetched URL content (auto-scraped from links above)");
    for (const s of scraped) {
      if (!s.text) continue;
      textParts.push(
        `### ${s.title || s.url}`,
        "```",
        s.text.slice(0, 4000),
        "```",
        ""
      );
    }
  }

  if (input.attachedDocs && input.attachedDocs.length > 0) {
    textParts.push("## Attached document content");
    for (const d of input.attachedDocs) {
      textParts.push(`### ${d.name}`, "```", d.text.slice(0, 6000), "```", "");
    }
  }

  if (input.existingVoice) {
    textParts.push(
      "## Existing voice guide (do NOT duplicate these, only add new material)",
      input.existingVoice,
      ""
    );
  }

  if (input.existingTaboos && input.existingTaboos.length > 0) {
    textParts.push(
      "## Existing taboos (do NOT duplicate)",
      input.existingTaboos.join(", "),
      ""
    );
  }

  textParts.push(
    "",
    "Use the extract_brand_signals tool. Only surface genuinely useful signals — " +
      "skip generic observations. If the paste is noise, return empty arrays and a " +
      "short summary explaining why."
  );

  const system = [
    "You are a senior brand strategist analyzing arbitrary material a founder",
    "pasted into a brand setup field. Your job is to distill real, usable brand",
    "signals — not restate the obvious.",
    "",
    "Be conservative. A handful of sharp rules is better than a long list of fluff.",
  ].join("\n");

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system,
    tools: [EXTRACT_SIGNALS_TOOL],
    tool_choice: { type: "tool", name: "extract_brand_signals" },
    messages: [{ role: "user", content: textParts.join("\n") }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude did not return structured brand signals.");
  }

  return brandSignalsSchema.parse(toolBlock.input);
}

// ── Merge into Brand ──

export async function mergeBrandSignals(
  brandId: string,
  signals: BrandSignals,
  opts: { mergeVoice?: boolean; mergeTaboos?: boolean; createLearnings?: boolean } = {
    mergeVoice: true,
    mergeTaboos: true,
    createLearnings: true,
  }
): Promise<{ learningsCreated: number }> {
  const brand = await prisma.brand.findUniqueOrThrow({ where: { id: brandId } });

  let newVoice = brand.voiceGuide ?? "";
  if (opts.mergeVoice && signals.voiceAdditions.trim()) {
    newVoice = newVoice
      ? `${newVoice.trim()}\n\n${signals.voiceAdditions.trim()}`
      : signals.voiceAdditions.trim();
  }

  const existingTaboos = new Set(
    brand.taboosList.map((t) => t.toLowerCase().trim())
  );
  const merged = [...brand.taboosList];
  if (opts.mergeTaboos) {
    for (const t of signals.taboos) {
      const v = t.toLowerCase().trim();
      if (v && !existingTaboos.has(v)) {
        merged.push(v);
        existingTaboos.add(v);
      }
    }
  }

  await prisma.brand.update({
    where: { id: brandId },
    data: {
      voiceGuide: newVoice || null,
      taboosList: merged,
    },
  });

  let learningsCreated = 0;
  if (opts.createLearnings) {
    for (const l of signals.learnings) {
      const exists = await prisma.brandLearning.findFirst({
        where: {
          brandId,
          text: { equals: l.text, mode: "insensitive" },
        },
      });
      if (exists) {
        await prisma.brandLearning.update({
          where: { id: exists.id },
          data: { strength: { increment: 1 } },
        });
        continue;
      }
      await prisma.brandLearning.create({
        data: {
          brandId,
          kind: l.kind,
          text: l.text,
          source: "manual",
          strength: 1,
        },
      });
      learningsCreated++;
    }
  }

  return { learningsCreated };
}
