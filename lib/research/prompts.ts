import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

// ── ResearchResult schema (validated after Claude tool-use) ──

export const researchResultSchema = z.object({
  summary: z.string().describe("2-3 sentence brand analysis"),
  pillars: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        targetShare: z.number().min(0).max(1),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        angles: z.array(z.string()).min(1).max(8),
      })
    )
    .min(2)
    .max(7),
  voiceGuide: z.string().describe("Paragraph describing brand voice"),
  tabooWords: z.array(z.string()).min(3).max(20),
  targetAudience: z.string().describe("Short target audience description"),
});

export type ResearchResult = z.infer<typeof researchResultSchema>;

// ── Anthropic tool definition for structured output ──

const PILLAR_COLORS = [
  "#4EB35E", "#44546C", "#B8472E", "#C89545", "#5A8A8F",
  "#7B68AE", "#D4785C", "#3D8B8B", "#A45B8C", "#5B8A3D",
];

export const PROPOSE_STRATEGY_TOOL: Tool = {
  name: "propose_strategy",
  description:
    "Propose a complete content strategy for the brand based on research. " +
    "Pillars are the high-level content themes. Angles are specific topic " +
    "ideas within each pillar. targetShare values should reflect how much " +
    "content weight each pillar deserves (they will be normalized to sum to 1.0).",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description: "2-3 sentence brand analysis based on the research",
      },
      pillars: {
        type: "array",
        description: "3-6 content pillars with angles",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Pillar name (2-4 words)" },
            description: {
              type: "string",
              description: "One-sentence pillar description",
            },
            targetShare: {
              type: "number",
              description:
                "Relative weight 0.0-1.0 (will be normalized). Higher = more content.",
            },
            color: {
              type: "string",
              description: `Hex color from this palette: ${PILLAR_COLORS.join(", ")}`,
              enum: PILLAR_COLORS,
            },
            angles: {
              type: "array",
              description: "3-5 specific content angle titles for this pillar",
              items: { type: "string" },
            },
          },
          required: ["name", "description", "targetShare", "color", "angles"],
        },
      },
      voiceGuide: {
        type: "string",
        description:
          "A paragraph describing the brand's ideal content voice — tone, " +
          "style, what to do and what to avoid. Be specific with examples.",
      },
      tabooWords: {
        type: "array",
        description:
          "5-15 words or phrases the brand should never use in content. " +
          "Include generic marketing clichés and any brand-specific landmines.",
        items: { type: "string" },
      },
      targetAudience: {
        type: "string",
        description: "Short description of the primary target audience",
      },
    },
    required: [
      "summary",
      "pillars",
      "voiceGuide",
      "tabooWords",
      "targetAudience",
    ],
  },
};

// ── Prompt builder ───────────────────────────────────────────

export function buildResearchPrompt(input: {
  brandName: string;
  websiteText: string;
  websiteTitle: string;
  referenceTexts: { url: string; text: string }[];
  existingVoice?: string;
  existingTaboos?: string[];
}): { system: string; user: string } {
  const system = [
    "You are a senior brand strategist and content director. Your job is to",
    "analyze a brand and propose a complete social media content strategy.",
    "",
    "You will be given the brand name and optionally scraped content from their",
    "website and reference materials.",
    "",
    "## IMPORTANT: Research first",
    "Before proposing the strategy, use the web_search tool to verify:",
    "1. What the brand actually sells (exact product form — gummies vs. powder,",
    "   service type, etc.). Scraped homepage text is often ambiguous.",
    "2. Their positioning, key differentiators, and any recent launches.",
    "3. Their social media presence and how they currently talk about themselves.",
    "4. Competitive landscape — who else plays in this category.",
    "",
    "Use 2-4 web searches to build a clear picture. Then call propose_strategy.",
    "",
    "Guidelines for the strategy:",
    "- Create 3-6 distinct content pillars that cover the brand's key themes",
    "- Each pillar should have 3-5 specific, actionable angle ideas",
    "- The voice guide should be specific and opinionated, not generic",
    "- Taboo words should include both brand-specific terms to avoid and",
    "  generic marketing clichés (e.g., 'synergy', 'unlock', 'gamechanger')",
    "- Target shares should reflect actual content weight — not equal splits",
    "- Use the propose_strategy tool to return your analysis",
  ].join("\n");

  const userParts: string[] = [
    `# Brand: ${input.brandName}`,
    "",
  ];

  if (input.websiteTitle) {
    userParts.push(`## Website: ${input.websiteTitle}`);
  }

  if (input.websiteText) {
    userParts.push(
      "## Website Content (scraped)",
      "```",
      input.websiteText,
      "```",
      ""
    );
  }

  if (input.referenceTexts.length > 0) {
    userParts.push("## Reference Materials");
    for (const ref of input.referenceTexts) {
      userParts.push(`### ${ref.url}`, "```", ref.text, "```", "");
    }
  }

  if (input.existingVoice) {
    userParts.push(
      "## Existing Voice Guide (user-provided — enhance but respect it)",
      input.existingVoice,
      ""
    );
  }

  if (input.existingTaboos && input.existingTaboos.length > 0) {
    userParts.push(
      "## Existing Taboo Words (always include these plus add more)",
      input.existingTaboos.join(", "),
      ""
    );
  }

  userParts.push(
    "",
    "Analyze this brand and propose a complete content strategy using the",
    "propose_strategy tool."
  );

  return { system, user: userParts.join("\n") };
}
