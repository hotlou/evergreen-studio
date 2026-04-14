import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBrandSignals, mergeBrandSignals } from "@/lib/brand-signals";

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
      // Only read text-ish docs inline. PDFs/DOCX would need parsing; skip for now.
      const ok =
        f.type.startsWith("text/") ||
        f.name.toLowerCase().endsWith(".md") ||
        f.name.toLowerCase().endsWith(".txt");
      if (!ok) {
        attachedDocs.push({
          name: f.name,
          text: `(Binary file "${f.name}" attached — not inlined.)`,
        });
        continue;
      }
      const txt = await f.text();
      attachedDocs.push({ name: f.name, text: txt.slice(0, 20_000) });
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
