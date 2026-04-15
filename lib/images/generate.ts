import OpenAI, { toFile } from "openai";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import type { ImageSettings } from "./prepare";

export type GenerateOptions = {
  prompt: string;
  referenceAssetIds?: string[];
  includeLogo?: boolean;
  settings?: Partial<ImageSettings>;
};

export type GeneratedImage = {
  mediaAssetId: string;
  url: string;
  prompt: string;
  settingsUsed: ImageSettings;
  modelUsed: string;
  referencesUsed: string[];
};

const DEFAULT_SETTINGS: ImageSettings = {
  model: "gpt-image-1.5",
  quality: "high",
  size: "1024x1024",
  background: "auto",
  output_format: "png",
  input_fidelity: "high",
  n: 1,
};

function isGptImageModel(model: string): boolean {
  return model.startsWith("gpt-image-");
}

/**
 * Append explicit reference-usage guidance to the user's prompt so the image
 * model actually uses the attachments (logo, creative assets) instead of just
 * treating them as style hints.
 */
function augmentPromptWithReferences(args: {
  prompt: string;
  logoUrl: string | null;
  includeLogo: boolean;
  creativeCount: number;
}): string {
  const refLines: string[] = [];

  if (args.includeLogo && args.logoUrl) {
    refLines.push(
      "- Reference image #1 is the BRAND LOGO. Place it visibly in the final composition " +
        "as a small corner lockup (top-right or bottom-right, ~8-12% of the frame), not " +
        "dominating the hero subject. Keep the logo's original colors and proportions — " +
        "do not recolor or redraw it. Treat it like a finished asset being composited."
    );
  }

  if (args.creativeCount > 0) {
    const whichStart =
      args.includeLogo && args.logoUrl ? "The remaining" : "The attached";
    refLines.push(
      `- ${whichStart} reference images are BRAND CREATIVE ASSETS ` +
        "(product shots, people whose likeness should carry through, graphics, " +
        "or stylistic anchors). Use them as visual source material: match the " +
        "lighting, palette, and subject identity where it makes sense. Do not " +
        "produce a generic stock image that ignores them."
    );
  }

  if (refLines.length === 0) return args.prompt;

  return [
    args.prompt.trim(),
    "",
    "## Reference usage (CRITICAL)",
    ...refLines,
  ].join("\n");
}

function contentTypeForFormat(fmt: ImageSettings["output_format"]): string {
  if (fmt === "png") return "image/png";
  if (fmt === "jpeg") return "image/jpeg";
  return "image/webp";
}

async function fetchAsFile(url: string, fallbackName: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reference image ${url}: ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/png";
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "png";
  const buf = Buffer.from(ab);
  return await toFile(buf, `${fallbackName}.${ext}`, { type: contentType });
}

export async function generateImageForPiece(
  pieceId: string,
  options: GenerateOptions
): Promise<GeneratedImage> {
  const piece = await prisma.contentPiece.findUniqueOrThrow({
    where: { id: pieceId },
    include: { brand: true, pillar: true, angle: true },
  });

  const settings: ImageSettings = {
    ...DEFAULT_SETTINGS,
    ...(options.settings ?? {}),
  };

  // Resolve reference images — brand logo (optional) + selected creative assets
  const refIds = options.referenceAssetIds ?? [];
  const refAssets = refIds.length
    ? await prisma.mediaAsset.findMany({
        where: { id: { in: refIds }, brandId: piece.brandId, kind: "image" },
      })
    : [];

  const referenceUrls: string[] = [];
  if (options.includeLogo && piece.brand.logoUrl) {
    referenceUrls.push(piece.brand.logoUrl);
  }
  for (const a of refAssets) referenceUrls.push(a.url);

  // Augment the prompt with explicit reference-usage instructions so the
  // model actually incorporates the logo/assets instead of treating them
  // as vague style inspiration.
  const finalPrompt = augmentPromptWithReferences({
    prompt: options.prompt,
    logoUrl: piece.brand.logoUrl,
    includeLogo: Boolean(options.includeLogo && piece.brand.logoUrl),
    creativeCount: refAssets.length,
  });

  const openai = new OpenAI();

  let b64: string | null = null;
  let directUrl: string | null = null;
  let usedModel: string = settings.model;

  const outputType = contentTypeForFormat(settings.output_format);

  // ── Path A: edit with references (any gpt-image-* model supports this) ──
  if (referenceUrls.length > 0 && isGptImageModel(settings.model)) {
    try {
      const files = await Promise.all(
        referenceUrls.map((u, i) => fetchAsFile(u, `ref-${i}`))
      );
      // The OpenAI SDK accepts an array of images via the image param.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editResult = await (openai.images.edit as any)({
        model: settings.model,
        prompt: finalPrompt,
        image: files,
        n: settings.n,
        size: settings.size === "auto" ? undefined : settings.size,
        quality: settings.quality,
        input_fidelity: settings.input_fidelity,
        output_format: settings.output_format,
        background: settings.background,
      });
      const first = editResult.data?.[0];
      if (first?.b64_json) b64 = first.b64_json;
      else if (first?.url) directUrl = first.url;
    } catch (err) {
      console.warn("images.edit failed, falling back to generate:", err);
    }
  }

  // ── Path B: plain generate ──
  if (!b64 && !directUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const genArgs: any = {
        model: settings.model,
        prompt: finalPrompt,
        n: settings.n,
        size: settings.size === "auto" ? undefined : settings.size,
      };
      if (isGptImageModel(settings.model)) {
        genArgs.quality = settings.quality;
        genArgs.output_format = settings.output_format;
        genArgs.background = settings.background;
      }
      const result = await openai.images.generate(genArgs);
      const first = result.data?.[0];
      if (first?.b64_json) b64 = first.b64_json;
      else if (first?.url) directUrl = first.url;
    } catch (err) {
      console.warn(`${settings.model} failed, falling back to dall-e-3:`, err);
      usedModel = "dall-e-3";
      const result = await openai.images.generate({
        model: "dall-e-3",
        prompt: finalPrompt,
        size: "1024x1024",
        n: 1,
      });
      const first = result.data?.[0];
      if (first?.url) directUrl = first.url;
      else if (first?.b64_json) b64 = first.b64_json;
    }
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

  const extension = settings.output_format;
  const pathname = `brands/${piece.brandId}/generated/${Date.now()}-${piece.id}.${extension}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: outputType,
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
          settings.quality,
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

  return {
    mediaAssetId: created.id,
    url: created.url,
    prompt: options.prompt,
    settingsUsed: settings,
    modelUsed: usedModel,
    referencesUsed: referenceUrls,
  };
}
