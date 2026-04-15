import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  ACCEPTED_IMAGE_TYPES,
  deleteBlob,
  uploadFile,
} from "@/lib/uploads";

export const runtime = "nodejs";

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
  const file = form.get("file");
  if (!brandId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "brandId and file are required" },
      { status: 400 }
    );
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}` },
      { status: 400 }
    );
  }

  try {
    const brand = await requireBrandAccess(brandId, session.user.id);

    const blob = await uploadFile(file, `brands/${brandId}/logo`);

    // Best-effort delete of previous logo
    if (brand.logoUrl && brand.logoUrl.includes("blob.vercel-storage.com")) {
      await deleteBlob(brand.logoUrl);
    }

    await prisma.brand.update({
      where: { id: brandId },
      data: { logoUrl: blob.url },
    });

    revalidatePath("/app/brand");
    revalidatePath("/app", "layout");
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Logo upload error:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { brandId } = await req.json();
  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }
  try {
    const brand = await requireBrandAccess(brandId, session.user.id);
    if (brand.logoUrl && brand.logoUrl.includes("blob.vercel-storage.com")) {
      await deleteBlob(brand.logoUrl);
    }
    await prisma.brand.update({
      where: { id: brandId },
      data: { logoUrl: null },
    });
    revalidatePath("/app/brand");
    revalidatePath("/app", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
