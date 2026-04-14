import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  ACCEPTED_DOC_TYPES,
  ACCEPTED_IMAGE_TYPES,
  classifyKind,
  uploadFile,
} from "@/lib/uploads";
import { enrichMediaAsset } from "@/lib/media/vision";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireBrandAccess(brandId: string, userId: string) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { workspace: { include: { memberships: true } } },
  });
  if (!brand) throw new Error("Brand not found");
  const isMember = brand.workspace.memberships.some((m) => m.userId === userId);
  if (!isMember) throw new Error("Access denied");
  return brand;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const brandId = String(form.get("brandId") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!brandId || files.length === 0) {
    return NextResponse.json(
      { error: "brandId and at least one file are required" },
      { status: 400 }
    );
  }

  try {
    await requireBrandAccess(brandId, session.user.id);

    const accepted = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOC_TYPES, "video/mp4"];
    const rejected: string[] = [];
    const assetIds: string[] = [];

    for (const file of files) {
      if (!accepted.includes(file.type)) {
        rejected.push(`${file.name} (${file.type || "unknown"})`);
        continue;
      }
      const kind = classifyKind(file.type);
      const blob = await uploadFile(file, `brands/${brandId}/uploads`);

      const asset = await prisma.mediaAsset.create({
        data: {
          brandId,
          kind,
          source: "uploaded",
          url: blob.url,
          caption: file.name,
          tags: [kind],
        },
      });
      assetIds.push(asset.id);

      if (kind === "image") {
        // Fire and forget — don't block the upload response on vision tagging
        enrichMediaAsset(asset.id).catch((err) =>
          console.error("vision tag failed:", err)
        );
      }
    }

    revalidatePath("/app/library");
    return NextResponse.json({ assetIds, rejected });
  } catch (err) {
    console.error("Media upload error:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
