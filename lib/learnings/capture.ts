import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/db";
import type { LearningKind, LearningSource } from "@prisma/client";

const learningCaptureSchema = z.object({
  captured: z.boolean(),
  kind: z.enum(["do_this", "dont", "tone", "visual"]).optional(),
  text: z.string().max(300).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const CAPTURE_TOOL: Tool = {
  name: "capture_learning",
  description:
    "Decide whether an edit reveals a useful brand learning. Most edits are minor " +
    "cleanups with no generalizable signal — skip them (captured: false). Only capture " +
    "when the edit shows a pattern the system should remember.",
  input_schema: {
    type: "object" as const,
    properties: {
      captured: {
        type: "boolean",
        description: "True only if this edit reveals a useful, generalizable rule.",
      },
      kind: {
        type: "string",
        enum: ["do_this", "dont", "tone", "visual"],
        description:
          "do_this = positive pattern to repeat; dont = thing to avoid; " +
          "tone = voice/style preference; visual = imagery/format preference",
      },
      text: {
        type: "string",
        description:
          "A single concise rule the system should remember (under 200 chars). " +
          "Write it as an instruction: e.g. 'Use plain English, avoid jargon' or " +
          "'Never start captions with a rhetorical question'.",
      },
      confidence: {
        type: "number",
        description: "0.0-1.0 — how confident you are this is a real pattern vs. noise.",
      },
    },
    required: ["captured"],
  },
};

/**
 * Analyze an edit (original → revised) and optionally capture a BrandLearning.
 * Runs as fire-and-forget after updatePieceBody — doesn't block the UI.
 */
export async function captureLearningFromEdit(params: {
  brandId: string;
  originalBody: string;
  revisedBody: string;
  source?: LearningSource;
}): Promise<void> {
  const { brandId, originalBody, revisedBody, source = "edit" } = params;

  // Skip tiny edits (< 20 char diff) — likely typos, not signal
  if (Math.abs(originalBody.length - revisedBody.length) < 20 &&
      originalBody.slice(0, 100) === revisedBody.slice(0, 100)) {
    return;
  }

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system:
        "You observe user edits to AI-generated social media captions to learn " +
        "brand preferences. Your job: decide if the diff reveals a real pattern " +
        "the system should remember, or if it's one-off noise. Be conservative — " +
        "most edits should NOT be captured. Only capture clear, generalizable rules.",
      tools: [CAPTURE_TOOL],
      tool_choice: { type: "tool", name: "capture_learning" },
      messages: [
        {
          role: "user",
          content: [
            "## Original (AI-generated)",
            "```",
            originalBody,
            "```",
            "",
            "## Revised (human-edited)",
            "```",
            revisedBody,
            "```",
            "",
            "What did the user change, and is there a pattern worth capturing?",
          ].join("\n"),
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") return;

    const result = learningCaptureSchema.parse(toolBlock.input);

    if (!result.captured || !result.kind || !result.text) return;
    if ((result.confidence ?? 0) < 0.6) return;

    // Check for duplicates (same text, case-insensitive)
    const existing = await prisma.brandLearning.findFirst({
      where: {
        brandId,
        text: { equals: result.text, mode: "insensitive" },
      },
    });

    if (existing) {
      // Bump strength if we see the same pattern again
      await prisma.brandLearning.update({
        where: { id: existing.id },
        data: { strength: { increment: 1 } },
      });
      return;
    }

    await prisma.brandLearning.create({
      data: {
        brandId,
        kind: result.kind as LearningKind,
        text: result.text,
        source,
        strength: 1,
      },
    });
  } catch (err) {
    // Non-blocking — log and continue
    console.error("captureLearningFromEdit failed:", err);
  }
}

/**
 * Capture an approval signal: bump strength on learnings associated with this piece's
 * angle (they were part of successful content).
 */
export async function recordApprovalSignal(pieceId: string): Promise<void> {
  try {
    const piece = await prisma.contentPiece.findUnique({
      where: { id: pieceId },
      select: { brandId: true, angleId: true },
    });
    if (!piece?.angleId) return;

    // Bump angle useCount already happens in generation. Here we just note
    // the approval — if later an approval loop needs to influence learnings,
    // we have the hook. For now it's a no-op placeholder.
  } catch (err) {
    console.error("recordApprovalSignal failed:", err);
  }
}
