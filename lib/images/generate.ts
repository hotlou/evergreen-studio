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
  // Prefer gpt-image-1.5 for now: it exposes input_fidelity="high" which
  // gives noticeably better adherence to brand logos + creative-asset
  // references. gpt-image-2 is available in the dropdown for testing.
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
 * input_fidelity is the gpt-image-1.x-era knob for "reproduce reference
 * images faithfully." gpt-image-2 removed the parameter (the API 400s if
 * you send it) — per OpenAI's docs the model accepts high-fidelity inputs
 * but doesn't let callers toggle how strictly it adheres. Anything outside
 * the 1.x family — gpt-image-2, dall-e-3 — skips the param.
 */
function supportsInputFidelity(model: string): boolean {
  return model === "gpt-image-1.5" || model === "gpt-image-1";
}

type PromptRef =
  | { kind: "logo"; url: string }
  | {
      kind: "asset";
      url: string;
      caption: string | null;
      tags: string[];
    };

/**
 * Append explicit per-image reference-usage guidance so the model knows what
 * each attached file IS and how to use it. Enumerates the refs in the exact
 * order we send them (logo first when included, then creative assets in the
 * order they appear in the dialog).
 */
function augmentPromptWithReferences(args: {
  prompt: string;
  refs: PromptRef[];
}): string {
  if (args.refs.length === 0) return args.prompt;

  const lines: string[] = [
    `You are being given ${args.refs.length} reference image${
      args.refs.length === 1 ? "" : "s"
    } via images.edit. Each is identified below in the order attached.`,
    "",
  ];

  args.refs.forEach((ref, i) => {
    const num = i + 1;
    if (ref.kind === "logo") {
      lines.push(
        `### Reference image #${num} — BRAND LOGO (PIXEL-PERFECT REQUIRED)`,
        "- CRITICAL: Reproduce this logo EXACTLY as supplied. Every letter, curve, " +
          "color, and proportion must be pixel-perfect. This is a legal trademark — " +
          "any deviation (wrong letter shapes, swapped colors, redrawn icon, missing " +
          "elements) is unacceptable.",
        "- Place it visibly in the final composition as a small corner lockup " +
          "(top-right or bottom-right, ~8-12% of the frame).",
        "- Do NOT recolor, redraw, restyle, simplify, or artistically reinterpret " +
          "the logo under any circumstances. Keep its original colors, proportions, " +
          "spacing, and negative space exactly intact.",
        "- Treat it as a finished asset being composited onto the image — NOT as " +
          "inspiration or a style reference. It must appear in the output exactly as " +
          "it appears in the input.",
        ""
      );
    } else {
      const desc =
        ref.caption?.trim() || ref.tags.slice(0, 4).join(", ") || "brand asset";
      const tagStr = ref.tags.length > 0 ? ` (tags: ${ref.tags.slice(0, 6).join(", ")})` : "";
      lines.push(
        `### Reference image #${num} — ${desc}${tagStr}`,
        "- Use as primary visual source material: subject identity, pose, wardrobe, " +
          "lighting direction, and color feel should carry through.",
        "- If this is a person, keep their likeness — do not swap faces.",
        "- If this is a product, keep the product's shape, material, and colorway.",
        "- If this is a graphic/mark, composite it in rather than reinterpreting it.",
        ""
      );
    }
  });

  lines.push(
    "GLOBAL RULE: the final image MUST visibly incorporate meaningful content " +
      "from every reference above. A generic image that ignores the references is wrong."
  );

  return [args.prompt.trim(), "", "## Reference usage (CRITICAL)", ...lines].join("\n");
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

  // Logo fidelity: when the brand logo is included as a reference, force high
  // input fidelity — lower fidelity causes the model to warp wordmarks, swap
  // colors, and reinterpret the icon. Non-negotiable.
  if (options.includeLogo && piece.brand.logoUrl) {
    settings.input_fidelity = "high";
  }

  // Resolve reference images — brand logo (optional) + selected creative assets
  const refIds = options.referenceAssetIds ?? [];
  const refAssets = refIds.length
    ? await prisma.mediaAsset.findMany({
        where: { id: { in: refIds }, brandId: piece.brandId, kind: "image" },
      })
    : [];

  const referenceUrls: string[] = [];
  const promptRefs: PromptRef[] = [];
  if (options.includeLogo && piece.brand.logoUrl) {
    referenceUrls.push(piece.brand.logoUrl);
    promptRefs.push({ kind: "logo", url: piece.brand.logoUrl });
  }
  // Preserve the order the user selected them in (refAssets is already in
  // ascending createdAt; we honor the referenceAssetIds input order instead).
  const refAssetById = new Map(refAssets.map((a) => [a.id, a]));
  for (const id of refIds) {
    const a = refAssetById.get(id);
    if (!a) continue;
    referenceUrls.push(a.url);
    promptRefs.push({
      kind: "asset",
      url: a.url,
      caption: a.caption,
      tags: a.tags,
    });
  }

  // Augment the prompt with explicit per-image reference-usage instructions.
  const finalPrompt = augmentPromptWithReferences({
    prompt: options.prompt,
    refs: promptRefs,
  });

  // Diagnostic: log exactly what we're about to send so Vercel function logs
  // make it obvious whether references were included and how.
  console.log(
    "[image-gen]",
    JSON.stringify({
      pieceId: piece.id,
      brandId: piece.brandId,
      model: settings.model,
      quality: settings.quality,
      size: settings.size,
      inputFidelity: settings.input_fidelity,
      referencesAttached: promptRefs.length,
      referencesKind: promptRefs.map((r) => r.kind),
      promptLength: finalPrompt.length,
      firstPromptChars: finalPrompt.slice(0, 200),
    })
  );

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
      console.log(
        "[image-gen] images.edit path",
        JSON.stringify({
          fileCount: files.length,
          fileSizes: files.map((f) => f.size),
          fileTypes: files.map((f) => f.type),
        })
      );
      // The OpenAI SDK accepts an array of images via the image param.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editArgs: any = {
        model: settings.model,
        prompt: finalPrompt,
        image: files,
        n: settings.n,
        size: settings.size === "auto" ? undefined : settings.size,
        quality: settings.quality,
        output_format: settings.output_format,
        background: settings.background,
      };
      if (supportsInputFidelity(settings.model)) {
        editArgs.input_fidelity = settings.input_fidelity;
      }
      const editResult = await (openai.images.edit as any)(editArgs);
      const first = editResult.data?.[0];
      if (first?.b64_json) b64 = first.b64_json;
      else if (first?.url) directUrl = first.url;
      console.log(
        "[image-gen] images.edit OK",
        JSON.stringify({ hasB64: !!b64, hasUrl: !!directUrl })
      );
    } catch (err) {
      console.warn("[image-gen] images.edit failed, falling back to generate:", err);
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
