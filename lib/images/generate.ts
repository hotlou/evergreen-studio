import OpenAI from "openai";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";

export type GeneratedImage = {
  mediaAssetId: string;
  url: string;
  prompt: string;
};

const DEFAULT_MODEL = "gpt-image-1";
const FALLBACK_MODEL = "dall-e-3";

/**
 * Build an image-generation prompt from the ContentPiece + Brand context.
 * We lean on the caption body, pillar, voice, and any brand color cues.
 */
function buildImagePrompt(args: {
  brandName: string;
  voiceGuide: string | null;
  colorTokens: Record<string, unknown> | null;
  pillarName: string | null;
  pillarColor: string | null;
  angleTitle: string | null;
  captionBody: string;
  logoUrl?: string | null;
}): string {
  const primary =
    (args.colorTokens as { primary?: string } | null)?.primary ??
    args.pillarColor ??
    "#4EB35E";

  const parts = [
    `Generate a single social media image for "${args.brandName}"`,
    args.pillarName ? `in the content pillar "${args.pillarName}"` : "",
    args.angleTitle ? `about "${args.angleTitle}"` : "",
    ".",
    "",
    "## Caption it must illustrate:",
    args.captionBody.slice(0, 1000),
    "",
    "## Brand voice & tone",
    args.voiceGuide?.slice(0, 800) || "Clean, modern, confident.",
    "",
    "## Visual direction",
    `- Anchor the palette around ${primary} (primary brand color).`,
    "- Square composition, 1:1, suited to Instagram feed.",
    "- Photographic or editorial illustration — never AI-looking slop.",
    "- No on-image text, no watermarks, no logos.",
    "- Leave breathing room at the top & bottom for overlay text.",
  ];

  if (args.logoUrl) {
    parts.push(
      "",
      "The brand's logo exists but must NOT appear in the image. The art should feel " +
        "like it belongs to the same visual world as the logo (consistent palette & energy)."
    );
  }

  return parts.filter(Boolean).join("\n");
}

export async function generateImageForPiece(
  pieceId: string
): Promise<GeneratedImage> {
  const piece = await prisma.contentPiece.findUniqueOrThrow({
    where: { id: pieceId },
    include: {
      brand: true,
      pillar: true,
      angle: true,
    },
  });

  const prompt = buildImagePrompt({
    brandName: piece.brand.name,
    voiceGuide: piece.brand.voiceGuide,
    colorTokens: piece.brand.colorTokens as Record<string, unknown> | null,
    pillarName: piece.pillar?.name ?? null,
    pillarColor: piece.pillar?.color ?? null,
    angleTitle: piece.angle?.title ?? null,
    captionBody: piece.body,
    logoUrl: piece.brand.logoUrl,
  });

  const openai = new OpenAI();

  let b64: string | null = null;
  let directUrl: string | null = null;
  let usedModel = DEFAULT_MODEL;

  try {
    const result = await openai.images.generate({
      model: DEFAULT_MODEL,
      prompt,
      size: "1024x1024",
      n: 1,
    });
    const first = result.data?.[0];
    if (first?.b64_json) b64 = first.b64_json;
    else if (first?.url) directUrl = first.url;
  } catch (err) {
    // Fall back to DALL·E 3 if gpt-image-1 isn't available for this account
    console.warn("gpt-image-1 failed, falling back to dall-e-3:", err);
    usedModel = FALLBACK_MODEL;
    const result = await openai.images.generate({
      model: FALLBACK_MODEL,
      prompt,
      size: "1024x1024",
      n: 1,
    });
    const first = result.data?.[0];
    if (first?.url) directUrl = first.url;
    else if (first?.b64_json) b64 = first.b64_json;
  }

  let buffer: Buffer;
  if (b64) {
    buffer = Buffer.from(b64, "base64");
  } else if (directUrl) {
    const res = await fetch(directUrl);
    if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.status}`);
    const ab = await res.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    throw new Error("Image generation returned no image");
  }

  const pathname = `brands/${piece.brandId}/generated/${Date.now()}-${piece.id}.png`;
  const blob = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/png",
  });

  const created = await prisma.$transaction(async (tx) => {
    const asset = await tx.mediaAsset.create({
      data: {
        brandId: piece.brandId,
        kind: "image",
        source: "generated",
        url: blob.url,
        caption: piece.body.slice(0, 200),
        tags: [
          usedModel,
          piece.pillar?.name.toLowerCase() ?? "",
          piece.angle?.title.toLowerCase() ?? "",
        ].filter(Boolean),
      },
    });

    await tx.contentPiece.update({
      where: { id: piece.id },
      data: {
        mediaAssetIds: {
          set: Array.from(new Set([...(piece.mediaAssetIds ?? []), asset.id])),
        },
      },
    });

    return asset;
  });

  return { mediaAssetId: created.id, url: created.url, prompt };
}
