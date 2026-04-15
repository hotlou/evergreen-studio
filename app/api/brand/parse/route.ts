import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBrandSignals, mergeBrandSignals } from "@/lib/brand-signals";
import { tagImageFromFile } from "@/lib/media/vision";

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

  let brandId = "";
  let pastedText = "";
  let attachedDocs: { name: string; text: string }[] = [];
  let autoMerge = false;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    brandId = String(form.get("brandId") ?? "");
    pastedText = String(form.get("text") ?? "");
    autoMerge = form.get("merge") === "1" || form.get("merge") === "true";

    const files = form.getAll("files");
    for (const f of files) {
      if (!(f instanceof File)) continue;
      if (f.size === 0) continue;

      // Images: describe via Claude vision, then feed the description as text.
      if (f.type.startsWith("image/")) {
        try {
          const tags = await tagImageFromFile(f);
          const descr = [
            `Image: ${f.name}`,
            `Subject: ${tags.subject}`,
            `Emotion: ${tags.emotion}`,
            `Caption: ${tags.caption}`,
            tags.dominantColors.length
              ? `Dominant colors: ${tags.dominantColors.join(", ")}`
              : "",
            tags.tags.length ? `Tags: ${tags.tags.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("\n");
          attachedDocs.push({ name: f.name, text: descr });
        } catch (err) {
          console.error("vision failed on attachment:", err);
          attachedDocs.push({
            name: f.name,
            text: `(Image "${f.name}" could not be described.)`,
          });
        }
        continue;
      }

      // Text-ish docs: read inline.
      const isText =
        f.type.startsWith("text/") ||
        f.name.toLowerCase().endsWith(".md") ||
        f.name.toLowerCase().endsWith(".txt");
      if (isText) {
        const txt = await f.text();
        attachedDocs.push({ name: f.name, text: txt.slice(0, 20_000) });
        continue;
      }

      // PDF/DOCX etc: note attached but don't inline (no parser yet).
      attachedDocs.push({
        name: f.name,
        text: `(Binary file "${f.name}" attached — not inlined. Describe its contents in your paste if relevant.)`,
      });
    }
  } else {
    const body = await req.json();
    brandId = body.brandId;
    pastedText = body.text ?? "";
    autoMerge = Boolean(body.merge);
    if (Array.isArray(body.attachedDocs)) {
      attachedDocs = body.attachedDocs
        .filter((d: unknown) => d && typeof d === "object")
        .slice(0, 6)
        .map((d: { name: string; text: string }) => ({
          name: String(d.name ?? "doc"),
          text: String(d.text ?? "").slice(0, 20_000),
        }));
    }
  }

  if (!brandId || (!pastedText.trim() && attachedDocs.length === 0)) {
    return NextResponse.json(
      { error: "brandId and some text or attached doc are required" },
      { status: 400 }
    );
  }

  try {
    const brand = await requireBrandAccess(brandId, session.user.id);

    const signals = await parseBrandSignals({
      brandName: brand.name,
      pastedText,
      attachedDocs,
      existingVoice: brand.voiceGuide,
      existingTaboos: brand.taboosList,
    });

    let learningsCreated = 0;
    if (autoMerge) {
      const merged = await mergeBrandSignals(brandId, signals);
      learningsCreated = merged.learningsCreated;
      revalidatePath("/app/brand");
      revalidatePath("/app/strategy");
      revalidatePath("/app/learnings");
    }

    return NextResponse.json({ signals, merged: autoMerge, learningsCreated });
  } catch (err) {
    console.error("Brand parse error:", err);
    const msg = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
