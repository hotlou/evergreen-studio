import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/db";

// ── Channel aspect preferences ──

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

const CHANNEL_SIZE: Record<string, ImageSize> = {
  instagram: "1024x1024",
  facebook: "1024x1024",
  threads: "1024x1024",
  x: "1536x1024",
  linkedin: "1536x1024",
  tiktok: "1024x1536",
  youtube: "1536x1024",
  pinterest: "1024x1536",
};

function sizeForChannel(channel: string): ImageSize {
  return CHANNEL_SIZE[channel] ?? "1024x1024";
}

// Which other channels the same aspect image tends to work on, so we can
// tell the generator "optimized for X, also suitable for Y, Z".
const CHANNEL_COMPATIBILITY: Record<string, string[]> = {
  instagram: ["Facebook", "Threads"],
  facebook: ["Instagram", "Threads"],
  threads: ["Instagram", "Facebook"],
  linkedin: ["X"],
  x: ["Threads", "LinkedIn"],
  tiktok: ["Instagram Reels", "YouTube Shorts"],
  youtube: ["LinkedIn", "X"],
  pinterest: ["Instagram Reels"],
};

function channelDisplayName(c: string): string {
  if (c === "x") return "X";
  if (c === "tiktok") return "TikTok";
  if (c === "youtube") return "YouTube";
  if (c === "linkedin") return "LinkedIn";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function channelSuitabilityLine(channel: string): string {
  const also = CHANNEL_COMPATIBILITY[channel] ?? [];
  const primary = channelDisplayName(channel);
  if (also.length === 0) {
    return `Optimized for ${primary}.`;
  }
  return `Optimized for ${primary}, also suitable for ${also.join(", ")}.`;
}

// ── Image settings (dev-visible) ──

export const imageSettingsSchema = z.object({
  model: z
    .enum(["gpt-image-1.5", "gpt-image-1", "dall-e-3"])
    .default("gpt-image-1.5"),
  quality: z.enum(["low", "medium", "high", "auto"]).default("high"),
  size: z
    .enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
    .default("1024x1024"),
  background: z.enum(["auto", "transparent", "opaque"]).default("auto"),
  output_format: z.enum(["png", "jpeg", "webp"]).default("png"),
  input_fidelity: z.enum(["low", "high"]).default("high"),
  n: z.number().min(1).max(4).default(1),
});

export type ImageSettings = z.infer<typeof imageSettingsSchema>;

// ── Creative asset lightweight shape ──

export type PreparedCreativeAsset = {
  id: string;
  url: string;
  caption: string | null;
  tags: string[];
  suggested: boolean;
  suggestionReason: string | null;
};

// ── Prepared plan returned to client ──

export type ImageGenerationPrep = {
  prompt: string;
  channel: string;
  settings: ImageSettings;
  logoUrl: string | null;
  includeLogoByDefault: boolean;
  creativeAssets: PreparedCreativeAsset[];
  meta: {
    pillarName: string | null;
    pillarColor: string | null;
    angleTitle: string | null;
    brandName: string;
    voiceGuide: string | null;
    primaryColor: string;
  };
  // Raw planner notes (visible to user as "why this prompt")
  planNotes: string;
};

// ── Anthropic tool: plan an image ──

const PLAN_IMAGE_TOOL: Tool = {
  name: "plan_image",
  description:
    "Produce a single tight image-generation prompt for this social post, " +
    "pick which brand creative assets to reference (logos, headshots, " +
    "watermarks, graphics), and include short reasoning so the user can " +
    "adjust it before firing the generator.",
  input_schema: {
    type: "object" as const,
    properties: {
      prompt: {
        type: "string",
        description:
          "The final image-generation prompt (150-400 words). Be concrete about " +
          "subject, composition, palette, mood, photographic style, and framing. " +
          "Never include on-image text, watermarks, logos baked into art, or " +
          "fictional brand names — those are layered via creative assets.",
      },
      notes: {
        type: "string",
        description:
          "2-4 sentence rationale covering: what the hero idea is, why it fits " +
          "the caption + pillar, and why these assets/colors were chosen.",
      },
      includeLogo: {
        type: "boolean",
        description:
          "Whether the piece should reference the brand logo as an input asset. " +
          "True for brand-forward hero shots; false for candid or editorial work " +
          "where the logo would feel forced.",
      },
      suggestedAssetIds: {
        type: "array",
        description:
          "IDs of creative assets (from the list provided) that should be passed " +
          "to the image generator as visual references. Pick 0-3 — only the ones " +
          "that are genuinely useful. Prefer brand marks, people whose likeness " +
          "matters, or stylistic references. Skip assets that don't directly apply.",
        items: { type: "string" },
      },
      assetReasoning: {
        type: "array",
        description:
          "Per-asset: { id, reason } for each asset you considered (selected or " +
          "not). Keep reasons under 120 chars.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            reason: { type: "string" },
          },
          required: ["id", "reason"],
        },
      },
    },
    required: ["prompt", "notes", "includeLogo", "suggestedAssetIds", "assetReasoning"],
  },
};

const planResultSchema = z.object({
  prompt: z.string().min(20).max(8000),
  notes: z.string().max(1200).default(""),
  includeLogo: z.boolean().default(false),
  suggestedAssetIds: z.array(z.string()).max(8).default([]),
  assetReasoning: z
    .array(z.object({ id: z.string(), reason: z.string().max(400) }))
    .default([]),
});

// ── Deterministic fallback prompt (no Claude) ──

function fallbackPrompt(args: {
  brandName: string;
  voiceGuide: string | null;
  primaryColor: string;
  pillarName: string | null;
  angleTitle: string | null;
  captionBody: string;
  channel: string;
}): string {
  return [
    `A single editorial social image for "${args.brandName}"`,
    args.pillarName ? `in the pillar "${args.pillarName}"` : "",
    args.angleTitle ? `illustrating "${args.angleTitle}"` : "",
    `for ${channelDisplayName(args.channel)}.`,
    "",
    `## Channel fit`,
    channelSuitabilityLine(args.channel),
    "",
    "## Caption it must illustrate",
    args.captionBody.slice(0, 900),
    "",
    "## Brand voice",
    args.voiceGuide?.slice(0, 700) || "Clean, modern, confident, never generic.",
    "",
    "## Visual direction",
    `- Anchor the palette around ${args.primaryColor} (primary brand color).`,
    "- Photographic or tasteful editorial illustration — never AI-looking slop.",
    "- No baked-in fake brand names, watermarks, or logos from other brands.",
    "- Leave a focal dead-zone in the composition where a headline or logo can be layered on top.",
    "- Lighting should feel intentional (directional, natural, dramatic) — never flat stock-photo lighting.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Prepare a generation plan ──

export async function prepareImageGeneration(
  pieceId: string
): Promise<ImageGenerationPrep> {
  const piece = await prisma.contentPiece.findUniqueOrThrow({
    where: { id: pieceId },
    include: { brand: true, pillar: true, angle: true },
  });

  const primaryColor =
    (piece.brand.colorTokens as { primary?: string } | null)?.primary ??
    piece.pillar?.color ??
    "#4EB35E";

  // Pull all creative assets for this brand
  const assetRows = await prisma.mediaAsset.findMany({
    where: {
      brandId: piece.brandId,
      kind: "image",
      OR: [{ tags: { has: "creative-asset" } }, { source: "uploaded" }],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const baseSettings: ImageSettings = imageSettingsSchema.parse({
    size: sizeForChannel(piece.channel),
  });

  // Attempt Claude plan; on failure, fall back to deterministic prompt.
  let claudePlan: z.infer<typeof planResultSchema> | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic();
      const assetList = assetRows.slice(0, 30).map((a) => ({
        id: a.id,
        caption: a.caption,
        tags: a.tags,
      }));

      const system = [
        "You are an art director planning a single image for a social post.",
        "Produce a concrete image-generation prompt that respects the brand voice,",
        "the channel's aspect, and the post's pillar/angle. Then decide which",
        "creative assets to hand the generator as visual references.",
        "",
        "The prompt must include a short 'Channel fit' note — e.g. 'Optimized",
        "for Instagram, also suitable for Facebook and Threads.' Use the",
        "channel suitability line provided in the user message verbatim.",
        "",
        "If the caption implies overlay text or requires photorealistic quality",
        "(product shots, people, editorial scenes), say so explicitly in the",
        "prompt — the generator uses that signal to allocate quality.",
        "",
        "Output through the plan_image tool. Do not bake fake brand names,",
        "watermarks, or competing logos into the prompt. Leave a focal",
        "dead-zone where a headline or the real brand logo can be layered on.",
      ].join("\n");

      const user = [
        `# Brand: ${piece.brand.name}`,
        `Primary color: ${primaryColor}`,
        `Channel: ${piece.channel} (aspect: ${baseSettings.size})`,
        `Channel suitability line (use verbatim in the prompt): ${channelSuitabilityLine(piece.channel)}`,
        piece.pillar ? `Pillar: ${piece.pillar.name} (${piece.pillar.color})` : "",
        piece.angle ? `Angle: ${piece.angle.title}` : "",
        "",
        "## Voice guide",
        piece.brand.voiceGuide?.slice(0, 1500) || "(none)",
        "",
        "## Caption this image must illustrate",
        piece.body.slice(0, 1200),
        "",
        piece.brand.logoUrl
          ? `## Brand logo available at: ${piece.brand.logoUrl}`
          : "## No brand logo uploaded yet.",
        "",
        "## Available creative assets",
        assetList.length === 0
          ? "(none uploaded yet)"
          : assetList
              .map(
                (a) =>
                  `- id=${a.id} · caption="${(a.caption ?? "").slice(
                    0,
                    120
                  )}" · tags=[${a.tags.slice(0, 6).join(", ")}]`
              )
              .join("\n"),
        "",
        "Use the plan_image tool.",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system,
        tools: [PLAN_IMAGE_TOOL],
        tool_choice: { type: "tool", name: "plan_image" },
        messages: [{ role: "user", content: user }],
      });

      const toolBlock = response.content.find((b) => b.type === "tool_use");
      if (toolBlock && toolBlock.type === "tool_use") {
        claudePlan = planResultSchema.parse(toolBlock.input);
      }
    } catch (err) {
      console.warn("Claude image plan failed, using fallback:", err);
    }
  }

  const suggestedSet = new Set(claudePlan?.suggestedAssetIds ?? []);
  const reasonMap = new Map<string, string>();
  for (const r of claudePlan?.assetReasoning ?? []) {
    reasonMap.set(r.id, r.reason);
  }

  const creativeAssets: PreparedCreativeAsset[] = assetRows.map((a) => ({
    id: a.id,
    url: a.url,
    caption: a.caption,
    tags: a.tags,
    suggested: suggestedSet.has(a.id),
    suggestionReason: reasonMap.get(a.id) ?? null,
  }));

  const suitabilityLine = channelSuitabilityLine(piece.channel);
  let finalPrompt =
    claudePlan?.prompt ??
    fallbackPrompt({
      brandName: piece.brand.name,
      voiceGuide: piece.brand.voiceGuide,
      primaryColor,
      pillarName: piece.pillar?.name ?? null,
      angleTitle: piece.angle?.title ?? null,
      captionBody: piece.body,
      channel: piece.channel,
    });
  const primaryDisplay = channelDisplayName(piece.channel);
  if (!finalPrompt.toLowerCase().includes(primaryDisplay.toLowerCase())) {
    finalPrompt = `${finalPrompt.trim()}\n\n## Channel fit\n${suitabilityLine}`;
  }

  return {
    prompt: finalPrompt,
    channel: piece.channel,
    settings: baseSettings,
    logoUrl: piece.brand.logoUrl,
    includeLogoByDefault: Boolean(
      piece.brand.logoUrl && (claudePlan?.includeLogo ?? false)
    ),
    creativeAssets,
    meta: {
      pillarName: piece.pillar?.name ?? null,
      pillarColor: piece.pillar?.color ?? null,
      angleTitle: piece.angle?.title ?? null,
      brandName: piece.brand.name,
      voiceGuide: piece.brand.voiceGuide,
      primaryColor,
    },
    planNotes:
      claudePlan?.notes ??
      "No AI planner available — using deterministic prompt. Edit to taste.",
  };
}
