import OpenAI, { toFile } from "openai";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";

export type EditImageOptions = {
  prompt: string;
  sourceMediaAssetId: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
};

export type EditedImage = {
  mediaAssetId: string;
  url: string;
  prompt: string;
  modelUsed: string;
};

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image ${url}: ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/png";
  const ext = contentType.split("/")[1]?.split(";")[0] ?? "png";
  const buf = Buffer.from(ab);
  return await toFile(buf, `${name}.${ext}`, { type: contentType });
}

export async function editImageForPiece(
  pieceId: string,
  options: EditImageOptions
): Promise<EditedImage> {
  const piece = await prisma.contentPiece.findUniqueOrThrow({
    where: { id: pieceId },
    include: { brand: true },
  });

  const sourceAsset = await prisma.mediaAsset.findUniqueOrThrow({
    where: { id: options.sourceMediaAssetId },
  });

  if (sourceAsset.brandId !== piece.brandId) {
    throw new Error("Asset does not belong to this brand");
  }

  const model = "gpt-image-1.5";
  const quality = options.quality ?? "high";
  const size = options.size === "auto" ? undefined : (options.size ?? "1024x1024");

  const sourceFile = await fetchAsFile(sourceAsset.url, "source");

  const editPrompt = [
    options.prompt.trim(),
    "",
    "IMPORTANT: You are editing the supplied image. Keep all elements that the " +
      "user did not ask to change exactly as they are — same composition, colors, " +
      "style, and content. Only modify what was explicitly requested.",
  ].join("\n");

  const openai = new OpenAI();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (openai.images.edit as any)({
    model,
    prompt: editPrompt,
    image: [sourceFile],
    n: 1,
    size,
    quality,
    input_fidelity: "high",
    output_format: "png",
  });

  const first = result.data?.[0];
  let buffer: Buffer;

  if (first?.b64_json) {
    buffer = Buffer.from(first.b64_json, "base64");
  } else if (first?.url) {
    const res = await fetch(first.url);
    if (!res.ok) throw new Error(`Failed to fetch edited image: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    throw new Error("Image edit returned no image");
  }

  const pathname = `brands/${piece.brandId}/edited/${Date.now()}-${piece.id}.png`;
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
        caption: `Edit of ${sourceAsset.id}: ${options.prompt.slice(0, 150)}`,
        tags: [model, "edited"],
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
    modelUsed: model,
  };
}
