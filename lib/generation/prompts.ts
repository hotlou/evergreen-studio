import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import type { SelectedSlot } from "./selector";

// ── Generated piece schema ───────────────────────────────────

export const generatedPieceSchema = z.object({
  body: z.string().min(10).max(2200),
  reasonWhy: z.string(),
});

export type GeneratedPiece = z.infer<typeof generatedPieceSchema>;

export const generateContentSchema = z.object({
  pieces: z.array(generatedPieceSchema),
});

// ── Tool definition for structured output ────────────────────

export const GENERATE_CONTENT_TOOL: Tool = {
  name: "generate_content_pack",
  description:
    "Generate Instagram caption content pieces. Each piece targets a specific " +
    "pillar and angle. The body is the full caption text. The reasonWhy explains " +
    "why this pillar/angle was chosen and what makes this caption effective.",
  input_schema: {
    type: "object" as const,
    properties: {
      pieces: {
        type: "array",
        description: "One generated piece per slot (in the same order as the slots provided)",
        items: {
          type: "object",
          properties: {
            body: {
              type: "string",
              description:
                "The full Instagram caption. 100-2200 chars. Include relevant " +
                "hashtags at the end (3-8 tags). Use line breaks for readability. " +
                "Start with a hook that stops the scroll.",
            },
            reasonWhy: {
              type: "string",
              description:
                "1-2 sentence explanation: why this pillar/angle was chosen, " +
                "what the creative angle is, and why the hook works.",
            },
          },
          required: ["body", "reasonWhy"],
        },
      },
    },
    required: ["pieces"],
  },
};

// ── Helpers ──────────────────────────────────────────────────

function getSeason(date: Date): string {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "Spring";
  if (m >= 6 && m <= 8) return "Summer";
  if (m >= 9 && m <= 11) return "Fall";
  return "Winter";
}

// ── Prompt builder ───────────────────────────────────────────

export function buildGenerationPrompt(input: {
  brandName: string;
  voiceGuide: string;
  taboos: string[];
  slots: SelectedSlot[];
  recentBodies: string[];
  learnings: { kind: string; content: string }[];
}): { system: string; user: string } {
  // Today's date + cultural context hint — Claude knows holidays/seasons/events
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const month = now.toLocaleDateString("en-US", { month: "long" });
  const season = getSeason(now);

  const system = [
    `You are a social media content strategist writing Instagram captions for "${input.brandName}".`,
    "",
    `## Today's Context`,
    `- Date: ${dateStr}`,
    `- Season: ${season} (Northern Hemisphere)`,
    `- Current month: ${month}`,
    `- If (and only if) there's a cultural moment in the next 2 weeks that genuinely fits`,
    `  this brand — a holiday, seasonal shift, sporting event, awareness day, etc. — you`,
    `  may weave it in. Do not force connections. Most captions should ignore the calendar.`,
    "",
    "## Your Voice",
    input.voiceGuide || "Write in a professional but approachable tone.",
    "",
    "## Rules",
    "- Every caption MUST match the assigned pillar and angle",
    "- Start with a scroll-stopping hook (question, bold claim, or surprising fact)",
    "- Use short paragraphs and line breaks for readability",
    "- End with 3-8 relevant hashtags",
    "- Captions should be 100-2200 characters",
    "- NEVER repeat phrasing from the recent captions listed below",
    "- NEVER use these banned words/phrases: " +
      (input.taboos.length > 0 ? input.taboos.join(", ") : "(none)"),
    "",
  ];

  if (input.learnings.length > 0) {
    system.push("## Brand Learnings (apply these)");
    for (const l of input.learnings) {
      system.push(`- [${l.kind}] ${l.content}`);
    }
    system.push("");
  }

  if (input.recentBodies.length > 0) {
    system.push(
      "## Recent Captions (DO NOT repeat similar hooks, angles, or phrasing)",
      "```"
    );
    for (const body of input.recentBodies.slice(0, 10)) {
      // Truncate to first 200 chars to keep context lean
      system.push(body.slice(0, 200) + (body.length > 200 ? "…" : ""));
      system.push("---");
    }
    system.push("```", "");
  }

  const userParts: string[] = [
    `Generate ${input.slots.length} Instagram caption(s) for the following pillar/angle assignments:`,
    "",
  ];

  for (let i = 0; i < input.slots.length; i++) {
    const s = input.slots[i];
    userParts.push(
      `### Slot ${i + 1}`,
      `- **Pillar**: ${s.pillar.name}${s.pillar.description ? ` — ${s.pillar.description}` : ""}`,
      `- **Angle**: ${s.angle.title}${s.angle.notes ? ` (${s.angle.notes})` : ""}`,
      ""
    );
  }

  userParts.push(
    "Use the generate_content_pack tool. Return one piece per slot, in order."
  );

  return { system: system.join("\n"), user: userParts.join("\n") };
}
