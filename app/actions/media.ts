"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteBlob } from "@/lib/uploads";
import { enrichMediaAsset } from "@/lib/media/vision";

async function requireAssetAccess(assetId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: { brand: { include: { workspace: { include: { memberships: true } } } } },
  });
  if (!asset) throw new Error("Asset not found");
  const isMember = asset.brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) throw new Error("Access denied");
  return asset;
}

export async function deleteMediaAsset(assetId: string) {
  const asset = await requireAssetAccess(assetId);
  if (asset.url.includes("blob.vercel-storage.com")) {
    await deleteBlob(asset.url);
  }
  await prisma.mediaAsset.delete({ where: { id: assetId } });
  revalidatePath("/app/library");
}

export async function retagMediaAsset(assetId: string) {
  await requireAssetAccess(assetId);
  await enrichMediaAsset(assetId);
  revalidatePath("/app/library");
}

export async function updateMediaAssetCaption(assetId: string, caption: string) {
  await requireAssetAccess(assetId);
  await prisma.mediaAsset.update({
    where: { id: assetId },
    data: { caption: caption.slice(0, 400) },
  });
  revalidatePath("/app/library");
}
