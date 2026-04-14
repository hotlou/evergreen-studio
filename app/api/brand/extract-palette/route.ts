import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tagImageFromFile } from "@/lib/media/vision";

export const runtime = "nodejs";
export const maxDuration = 60;

const ACCEPTED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

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
      { error: "brandId and an image file are required" },
      { status: 400 }
    );
  }
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type || "unknown"}` },
      { status: 400 }
    );
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image too large (8 MB max for palette extraction)" },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { workspace: { include: { memberships: true } } },
  });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }
  const isMember = brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const tags = await tagImageFromFile(file);
    return NextResponse.json({
      caption: tags.caption,
      subject: tags.subject,
      emotion: tags.emotion,
      colors: tags.dominantColors,
      tags: tags.tags,
    });
  } catch (err) {
    console.error("extract-palette error:", err);
    const msg = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
