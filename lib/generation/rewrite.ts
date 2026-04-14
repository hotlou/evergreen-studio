import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { generatedPieceSchema } from "./prompts";

export type RewriteInstruction =
  | "shorten"
  | "expand"
  | "one_line"
  | "double_it"
  | "punchier";

const INSTRUCTION_GUIDANCE: Record<RewriteInstruction, string> = {
  shorten: "Cut this caption to roughly 50% of its current length while keeping the core hook and message. Remove fluff, redundancy, and any weak lines.",
  expand: "Expand this caption by roughly 50% — add texture, specifics, or a second beat. Don't pad; add real content.",
  one_line: "Rewrite this as a single punchy line (under 120 characters, no hashtags, no line breaks). Just the hook and payoff.",
  double_it: "Double the length. Add examples, depth, or a narrative arc. Keep the same voice and core message.",
  punchier: "Rewrite this to be punchier, tighter, and more opinionated. Shorter sentences. Stronger verbs. Cut hedging.",
};

/**
 * Rewrite an existing piece with a length/style instruction.
 * Creates a NEW ContentPiece row so the user can compare — doesn't mutate the original.
 */
export async function rewritePiece(
  pieceId: string,
  instruction: RewriteInstruction
): Promise<{ id: string; body: string; reasonWhy: string | null }> {
  const piece = await prisma.contentPiece.findUniqueOrThrow({
    where: { id: pieceId },
    include: {
      brand: true,
      pillar: true,
      angle: true,
    },
  });

  const system = [
    `You are rewriting an Instagram caption for "${piece.brand.name}".`,
    "",
    "## Voice",
    piece.brand.voiceGuide || "Professional but approachable.",
    "",
    "## Rules",
    "- Keep the same pillar and angle focus",
    "- Preserve any brand-specific facts (product names, claims, data)",
    "- NEVER use these banned words: " +
      (piece.brand.taboosList.length > 0
        ? piece.brand.taboosList.join(", ")
        : "(none)"),
    "",
    "## Current pillar/angle",
    piece.pillar ? `Pillar: ${piece.pillar.name}` : "",
    piece.angle ? `Angle: ${piece.angle.title}` : "",
    "",
    "## Your task",
    INSTRUCTION_GUIDANCE[instruction],
    "",
    "Return ONLY the rewritten caption body — no preamble, no commentary, no markdown fences.",
  ].join("\n");

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system,
    messages: [
      {
        role: "user",
        content: `Original caption:\n\n${piece.body}\n\nRewrite it per the instruction.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const newBody = textBlock.text.trim();

  // Validate
  generatedPieceSchema.shape.body.parse(newBody);

  // Create new piece (preserve original)
  const created = await prisma.contentPiece.create({
    data: {
      brandId: piece.brandId,
      pillarId: piece.pillarId,
      angleId: piece.angleId,
      channel: piece.channel,
      body: newBody,
      reasonWhy: `Rewritten (${instruction.replace("_", " ")}) from piece created ${piece.generatedAt.toLocaleDateString()}.`,
      status: "draft",
    },
  });

  return { id: created.id, body: created.body, reasonWhy: created.reasonWhy };
}
