import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

// ── Schemas ──────────────────────────────────────────────────

export const redirectScopeSchema = z.enum([
  "pillars",
  "voice",
  "taboos",
]);

export type RedirectScope = z.infer<typeof redirectScopeSchema>;

export const redirectInputSchema = z.object({
  scope: redirectScopeSchema,
  prompt: z.string().min(5).max(500),
  channels: z.array(z.string()).optional(),
  demographics: z
    .object({
      ageRange: z.string().optional(),
      gender: z.string().optional(),
      geography: z.string().optional(),
      psychographic: z.string().optional(),
    })
    .optional(),
});

export type RedirectInput = z.infer<typeof redirectInputSchema>;

// ── Output schemas for each scope ────────────────────────────

const pillarsOutputSchema = z.object({
  pillars: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      targetShare: z.number().min(0).max(1),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      angles: z.array(z.string()).min(1),
    })
  ),
});

const voiceOutputSchema = z.object({
  voiceGuide: z.string(),
});

const taboosOutputSchema = z.object({
  tabooWords: z.array(z.string()),
});

// ── Tools ────────────────────────────────────────────────────

const PILLAR_COLORS = [
  "#4EB35E", "#44546C", "#B8472E", "#C89545", "#5A8A8F",
  "#7B68AE", "#D4785C", "#3D8B8B", "#A45B8C", "#5B8A3D",
];

const PILLARS_TOOL: Tool = {
  name: "propose_pillars",
  description: "Propose replacement content pillars based on the redirect prompt.",
  input_schema: {
    type: "object" as const,
    properties: {
      pillars: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            targetShare: { type: "number" },
            color: { type: "string", enum: PILLAR_COLORS },
            angles: { type: "array", items: { type: "string" } },
          },
          required: ["name", "description", "targetShare", "color", "angles"],
        },
      },
    },
    required: ["pillars"],
  },
};

const VOICE_TOOL: Tool = {
  name: "propose_voice",
  description: "Propose a replacement voice guide paragraph.",
  input_schema: {
    type: "object" as const,
    properties: {
      voiceGuide: { type: "string" },
    },
    required: ["voiceGuide"],
  },
};

const TABOOS_TOOL: Tool = {
  name: "propose_taboos",
  description: "Propose an updated taboo words list.",
  input_schema: {
    type: "object" as const,
    properties: {
      tabooWords: { type: "array", items: { type: "string" } },
    },
    required: ["tabooWords"],
  },
};

// ── Redirect runner ──────────────────────────────────────────

export type RedirectOutput =
  | { scope: "pillars"; pillars: z.infer<typeof pillarsOutputSchema>["pillars"] }
  | { scope: "voice"; voiceGuide: string }
  | { scope: "taboos"; tabooWords: string[] };

export async function runRedirect(
  ctx: {
    brandName: string;
    currentVoice: string;
    currentTaboos: string[];
    currentPillars: { name: string; description: string | null; targetShare: number }[];
  },
  input: RedirectInput
): Promise<RedirectOutput> {
  const demo = input.demographics;
  const demoLines: string[] = [];
  if (demo?.ageRange) demoLines.push(`- Age range: ${demo.ageRange}`);
  if (demo?.gender) demoLines.push(`- Gender: ${demo.gender}`);
  if (demo?.geography) demoLines.push(`- Geography: ${demo.geography}`);
  if (demo?.psychographic) demoLines.push(`- Psychographic: ${demo.psychographic}`);

  const system = [
    `You are a brand strategist helping "${ctx.brandName}" refine their content strategy.`,
    "",
    "The user wants to redirect ONE specific section of their strategy. You must not",
    "touch anything else. Only output what the section scope asks for.",
    "",
    "## Current strategy (for context only — do not regenerate untouched parts)",
    "### Voice",
    ctx.currentVoice || "(not set)",
    "",
    "### Pillars",
    ...ctx.currentPillars.map(
      (p) => `- ${p.name} (${Math.round(p.targetShare * 100)}%) — ${p.description ?? ""}`
    ),
    "",
    "### Taboo words",
    ctx.currentTaboos.length > 0 ? ctx.currentTaboos.join(", ") : "(none)",
    "",
    input.channels && input.channels.length > 0
      ? `## Target channels\n${input.channels.join(", ")}`
      : "",
    demoLines.length > 0 ? `## Target audience\n${demoLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userMsg = `## Redirect scope: ${input.scope}\n\n## User instruction\n${input.prompt}\n\nUse the tool to return only the updated section.`;

  const anthropic = new Anthropic();

  if (input.scope === "pillars") {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system,
      tools: [PILLARS_TOOL],
      tool_choice: { type: "tool", name: "propose_pillars" },
      messages: [{ role: "user", content: userMsg }],
    });
    const toolBlock = res.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") throw new Error("No tool response");
    const parsed = pillarsOutputSchema.parse(toolBlock.input);
    return { scope: "pillars", pillars: parsed.pillars };
  }

  if (input.scope === "voice") {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      tools: [VOICE_TOOL],
      tool_choice: { type: "tool", name: "propose_voice" },
      messages: [{ role: "user", content: userMsg }],
    });
    const toolBlock = res.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") throw new Error("No tool response");
    const parsed = voiceOutputSchema.parse(toolBlock.input);
    return { scope: "voice", voiceGuide: parsed.voiceGuide };
  }

  // taboos
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system,
    tools: [TABOOS_TOOL],
    tool_choice: { type: "tool", name: "propose_taboos" },
    messages: [{ role: "user", content: userMsg }],
  });
  const toolBlock = res.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") throw new Error("No tool response");
  const parsed = taboosOutputSchema.parse(toolBlock.input);
  return { scope: "taboos", tabooWords: parsed.tabooWords };
}
