import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { selectSlots, type SelectedSlot } from "./selector";
import {
  buildGenerationPrompt,
  GENERATE_CONTENT_TOOL,
  generateContentSchema,
  type GeneratedPiece,
} from "./prompts";

export type GeneratedContentPiece = {
  id: string;
  pillarId: string;
  pillarName: string;
  pillarColor: string;
  angleId: string;
  angleTitle: string;
  body: string;
  reasonWhy: string;
  status: string;
};

/**
 * Thrown when Claude's tool-use input is shaped wrong (e.g. `pieces` returned
 * as a stringified JSON that won't parse). The pipeline retries once on this
 * before bubbling — the API layer maps it to a friendly user-facing message.
 */
export class MalformedToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedToolInputError";
  }
}

/**
 * Thrown when Claude truncates output by hitting the max_tokens ceiling.
 * Retrying with the same budget won't help — the UI should suggest
 * generating fewer captions or tightening the brand's content.
 */
export class GenerationTruncatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationTruncatedError";
  }
}

/**
 * Full generation pipeline:
 * 1. Select pillar+angle slots (anti-rep scheduling)
 * 2. Fetch context (voice, taboos, recent pieces, learnings)
 * 3. Call Claude to generate captions
 * 4. Persist ContentPiece rows + update angle usage
 * 5. Return generated pieces
 */
export async function generateContentPack(
  brandId: string,
  channel: string = "instagram",
  count: number = 3
): Promise<GeneratedContentPiece[]> {
  // 1. Select slots
  const slots = await selectSlots(brandId, channel, count);

  // 2. Fetch brand context
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
  });

  // Recent pieces for anti-repetition context
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentPieces = await prisma.contentPiece.findMany({
    where: {
      brandId,
      channel: channel as never,
      generatedAt: { gte: thirtyDaysAgo },
      status: { not: "archived" },
    },
    select: { body: true },
    orderBy: { generatedAt: "desc" },
    take: 15,
  });

  // Brand learnings (M5) — promoted rules first, then highest-strength learnings
  const learnings = await prisma.brandLearning.findMany({
    where: { brandId },
    select: { kind: true, text: true, promotedToRule: true },
    orderBy: [{ promotedToRule: "desc" }, { strength: "desc" }],
    take: 12,
  });

  // 3. Build prompt and call Claude (with one retry on malformed tool input —
  // Claude occasionally returns `pieces` as a stringified JSON array on cold
  // brands; a single retry almost always resolves it without surfacing.)
  const { system, user } = buildGenerationPrompt({
    brandName: brand.name,
    voiceGuide: brand.voiceGuide ?? "",
    taboos: brand.taboosList,
    slots,
    recentBodies: recentPieces.map((p) => p.body),
    learnings: learnings.map((l) => ({
      kind: l.promotedToRule ? `${l.kind} (RULE)` : l.kind,
      content: l.text,
    })),
  });

  let pieces: GeneratedPiece[];
  try {
    pieces = await callClaudeAndParse(system, user);
  } catch (err) {
    // Truncation can't be solved by retrying with the same budget — bubble it.
    if (err instanceof GenerationTruncatedError) throw err;
    if (err instanceof MalformedToolInputError) {
      console.warn(
        "Generation: malformed tool input on first attempt, retrying once.",
        err.message
      );
      pieces = await callClaudeAndParse(system, user);
    } else {
      throw err;
    }
  }

  // 4. Persist pieces + update angle usage
  return await persistPieces(brandId, channel, slots, pieces);
}

async function callClaudeAndParse(
  system: string,
  user: string
): Promise<GeneratedPiece[]> {
  const anthropic = new Anthropic();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cache_control not in SDK types
  const systemBlock: any = {
    type: "text",
    text: system,
    cache_control: { type: "ephemeral" },
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: [systemBlock],
    tools: [GENERATE_CONTENT_TOOL],
    tool_choice: { type: "tool", name: "generate_content_pack" },
    messages: [{ role: "user", content: user }],
  });

  // Log usage and stop reason so incidents are diagnosable from Vercel logs.
  console.log(
    "Generation: claude response",
    JSON.stringify({
      stop_reason: response.stop_reason,
      usage: response.usage,
    })
  );

  // If Claude hit the max_tokens ceiling, tool input is almost certainly
  // truncated. Retrying with the same budget won't help — surface a distinct
  // error so the UI can say something useful.
  if (response.stop_reason === "max_tokens") {
    throw new GenerationTruncatedError(
      "Claude ran out of output space for this brand's content. Try generating fewer captions, or shorten the voice guide and pillar descriptions."
    );
  }

  // Extract tool-use result
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude did not return a tool-use response");
  }

  const raw = toolBlock.input as Record<string, unknown>;

  // Defensive: Claude sometimes returns `pieces` as a stringified JSON array
  // instead of a real array. Unwrap it if so — with a repair step for the
  // most common failure mode (raw \n/\t/\r characters embedded inside string
  // values, which JSON.parse rejects).
  if (typeof raw.pieces === "string") {
    const rawString = raw.pieces;
    const parsed = tryParseJsonLenient(rawString);
    if (parsed === null) {
      console.error(
        "Generation: could not parse pieces string. Length=" +
          rawString.length +
          ", first 2500 chars:",
        rawString.slice(0, 2500)
      );
      throw new MalformedToolInputError(
        "Claude returned pieces as a malformed JSON string."
      );
    }
    raw.pieces = parsed;
  }
  // Also handle the case where the whole input is a string (rare)
  let parsedRaw: Record<string, unknown> = raw;
  if (typeof raw === "string") {
    const parsed = tryParseJsonLenient(raw as unknown as string);
    if (parsed === null) {
      throw new MalformedToolInputError("Claude returned malformed tool input.");
    }
    parsedRaw = parsed as Record<string, unknown>;
  }

  try {
    const { pieces } = generateContentSchema.parse(parsedRaw);
    return pieces;
  } catch (err) {
    // Schema validation failure on tool input is the same class of issue —
    // surface as MalformedToolInputError so the retry path catches it.
    throw new MalformedToolInputError(
      err instanceof Error
        ? `Tool input failed schema validation: ${err.message}`
        : "Tool input failed schema validation."
    );
  }
}

async function persistPieces(
  brandId: string,
  channel: string,
  slots: SelectedSlot[],
  pieces: GeneratedPiece[]
): Promise<GeneratedContentPiece[]> {
  const results: GeneratedContentPiece[] = [];

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const piece = pieces[i];
      if (!piece) continue;

      const created = await tx.contentPiece.create({
        data: {
          brandId,
          pillarId: slot.pillar.id,
          angleId: slot.angle.id,
          channel: channel as never,
          body: piece.body,
          reasonWhy: piece.reasonWhy,
          status: "draft",
        },
      });

      // Bump angle usage
      await tx.angle.update({
        where: { id: slot.angle.id },
        data: {
          lastUsedAt: new Date(),
          useCount: { increment: 1 },
        },
      });

      results.push({
        id: created.id,
        pillarId: slot.pillar.id,
        pillarName: slot.pillar.name,
        pillarColor: slot.pillar.color,
        angleId: slot.angle.id,
        angleTitle: slot.angle.title,
        body: piece.body,
        reasonWhy: piece.reasonWhy,
        status: "draft",
      });
    }
  });

  return results;
}

/**
 * Parse JSON with a repair pass for Claude's two most common malformations:
 *   (a) raw control characters (\n, \r, \t) embedded inside string values
 *       without being escaped; and
 *   (b) embedded unescaped double quotes inside string values — e.g. a
 *       caption body that contains a quoted phrase like `says "hi"`.
 *
 * We walk the string with a tiny state machine. For each `"` we encounter
 * while inside a string, we look ahead to the next non-whitespace character:
 * if it's a structural JSON char (`:`, `,`, `}`, `]`, or EOF) the quote is
 * treated as a legitimate string close; otherwise it's rewritten as `\"`.
 * This is heuristic but handles the overwhelming majority of Claude's
 * tool-input malformations.
 *
 * Returns null if the string still can't be parsed after repair.
 */
function tryParseJsonLenient(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    // fall through to repair attempt
  }

  let repaired = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (escaped) {
      repaired += c;
      escaped = false;
      continue;
    }
    if (c === "\\") {
      repaired += c;
      escaped = true;
      continue;
    }
    if (c === '"') {
      if (!inString) {
        inString = true;
        repaired += c;
        continue;
      }
      // Inside a string. Look ahead past whitespace to decide if this `"`
      // closes the string or is an embedded unescaped quote.
      let j = i + 1;
      while (
        j < input.length &&
        (input[j] === " " ||
          input[j] === "\t" ||
          input[j] === "\n" ||
          input[j] === "\r")
      ) {
        j++;
      }
      const nextCh = j < input.length ? input[j] : null;
      if (
        nextCh === null ||
        nextCh === ":" ||
        nextCh === "," ||
        nextCh === "}" ||
        nextCh === "]"
      ) {
        inString = false;
        repaired += c;
      } else {
        // Embedded unescaped quote — escape it and stay inside the string.
        repaired += '\\"';
      }
      continue;
    }
    if (inString) {
      if (c === "\n") {
        repaired += "\\n";
        continue;
      }
      if (c === "\r") {
        repaired += "\\r";
        continue;
      }
      if (c === "\t") {
        repaired += "\\t";
        continue;
      }
      // Other C0 control chars: strip
      if (c.charCodeAt(0) < 0x20) continue;
    }
    repaired += c;
  }

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}
