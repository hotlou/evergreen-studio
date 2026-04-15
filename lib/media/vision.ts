import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/db";
import { normalizeHexColors } from "@/lib/media/color";

// ── Schema ──
// Accept any strings for dominantColors; we normalize after parse so we don't
// reject responses that come back as "#fff", "rgb(...)", or plain hex.

export const visionTagsSchema = z
  .object({
    caption: z.string().max(300).default(""),
    subject: z.string().max(80).default(""),
    emotion: z.string().max(60).default(""),
    dominantColors: z.array(z.string()).max(12).default([]),
    tags: z.array(z.string().min(1).max(40)).max(16).default([]),
  })
  .transform((v) => ({
    ...v,
    dominantColors: normalizeHexColors(v.dominantColors).slice(0, 6),
  }));

export type VisionTags = z.infer<typeof visionTagsSchema>;

// ── Anthropic tool ──

const TAG_IMAGE_TOOL: Tool = {
  name: "tag_image",
  description:
    "Look at the image and return a short caption, the primary subject, dominant " +
    "hex colors, the overall emotion, and a handful of searchable tags.",
  input_schema: {
    type: "object" as const,
    properties: {
      caption: {
        type: "string",
        description: "One-sentence factual caption of what's in the image.",
      },
      subject: {
        type: "string",
        description: "Short noun phrase naming the main subject (e.g., 'matcha latte').",
      },
      emotion: {
        type: "string",
        description:
          "One or two word vibe/emotion of the image (e.g., 'calm', 'energetic', 'moody').",
      },
      dominantColors: {
        type: "array",
        description:
          "2-5 dominant colors as 6-digit uppercase hex strings like '#4EB35E'. " +
          "Do NOT use rgb(), names, or 3-digit shorthand — always full 6-digit hex.",
        items: { type: "string" },
      },
      tags: {
        type: "array",
        description:
          "6-12 lowercase searchable tags. Include subject, setting, format " +
          "(e.g., 'flatlay', 'portrait'), and any brand-relevant keywords.",
        items: { type: "string" },
      },
    },
    required: ["caption", "subject", "emotion", "dominantColors", "tags"],
  },
};

const ACCEPTED_IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type AcceptedImageMediaType = (typeof ACCEPTED_IMAGE_MEDIA_TYPES)[number];

function normalizeImageMediaType(raw: string | null | undefined): AcceptedImageMediaType {
  if (!raw) return "image/jpeg";
  const lower = raw.toLowerCase();
  if (ACCEPTED_IMAGE_MEDIA_TYPES.includes(lower as AcceptedImageMediaType)) {
    return lower as AcceptedImageMediaType;
  }
  if (lower === "image/jpg") return "image/jpeg";
  // Claude vision doesn't accept svg; skip by returning jpeg as a sentinel (caller should skip)
  return "image/jpeg";
}

// ── Tag image by URL or base64 ──

type ImageSource =
  | { kind: "url"; url: string }
  | { kind: "base64"; mediaType: AcceptedImageMediaType; data: string };

async function tagImage(source: ImageSource): Promise<VisionTags> {
  const anthropic = new Anthropic();
  const imageBlock =
    source.kind === "url"
      ? {
          type: "image",
          source: { type: "url", url: source.url },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: source.mediaType,
            data: source.data,
          },
        };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system:
      "You are an art director tagging brand imagery. Be specific and useful — " +
      "avoid generic tags like 'nice' or 'good'. Focus on what would help a " +
      "marketer search for this image later.",
    tools: [TAG_IMAGE_TOOL],
    tool_choice: { type: "tool", name: "tag_image" },
    messages: [
      {
        role: "user",
        content: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          imageBlock as any,
          {
            type: "text",
            text: "Tag this image using the tag_image tool.",
          },
        ],
      },
    ],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude did not return vision tags");
  }
  return visionTagsSchema.parse(toolBlock.input);
}

export function tagImageByUrl(imageUrl: string): Promise<VisionTags> {
  return tagImage({ kind: "url", url: imageUrl });
}

export async function tagImageFromFile(file: File): Promise<VisionTags> {
  const mediaType = normalizeImageMediaType(file.type);
  const ab = await file.arrayBuffer();
  const data = Buffer.from(ab).toString("base64");
  return tagImage({ kind: "base64", mediaType, data });
}

// Fire-and-forget: enrich a MediaAsset after upload with vision tags.
export async function enrichMediaAsset(mediaAssetId: string): Promise<void> {
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset) return;
    if (asset.kind !== "image") return;

    const tags = await tagImageByUrl(asset.url);

    const combined = Array.from(
      new Set([
        ...(asset.tags ?? []),
        tags.subject?.toLowerCase(),
        tags.emotion?.toLowerCase(),
        ...tags.tags.map((t) => t.toLowerCase()),
        ...tags.dominantColors,
      ].filter(Boolean) as string[])
    );

    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        caption: asset.caption ?? tags.caption,
        tags: combined,
      },
    });
  } catch (err) {
    console.error("enrichMediaAsset failed:", err);
  }
}
