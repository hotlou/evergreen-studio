"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BRAND_COOKIE_NAME } from "@/lib/brand";

async function requireBrandAccess(brandId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { workspace: { include: { memberships: true } } },
  });
  if (!brand) throw new Error("Brand not found");
  const isMember = brand.workspace.memberships.some(
    (m) => m.userId === session.user.id
  );
  if (!isMember) throw new Error("Access denied");
  return brand;
}

export async function selectBrand(brandId: string) {
  (await cookies()).set(BRAND_COOKIE_NAME, brandId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app", "layout");
}

const createBrandSchema = z.object({
  name: z.string().min(1).max(80),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  referenceUrls: z.array(z.string().url()).max(20).default([]),
  voiceGuide: z.string().max(4000).optional(),
  taboosList: z.array(z.string().min(1).max(40)).max(64).default([]),
  channels: z.array(z.string()).default(["instagram"]),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#4EB35E"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  pasteContext: z.string().max(20_000).optional(),
});

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "brand"
  );
}

export async function createBrand(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const logoFile = formData.get("logoFile");
  let logoUrl = String(formData.get("logoUrl") ?? "");
  if (!logoUrl && logoFile instanceof File && logoFile.size > 0) {
    const { uploadFile } = await import("@/lib/uploads");
    try {
      const blob = await uploadFile(logoFile, "brands/intake-logos");
      logoUrl = blob.url;
    } catch (err) {
      console.error("Intake logo upload failed (non-fatal):", err);
    }
  }

  const parsed = createBrandSchema.parse({
    name: formData.get("name"),
    websiteUrl: formData.get("websiteUrl") || undefined,
    referenceUrls: String(formData.get("referenceUrls") ?? "")
      .split(/[\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    voiceGuide: formData.get("voiceGuide") ?? undefined,
    taboosList: String(formData.get("taboosList") ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
    channels: formData.getAll("channels").map(String),
    primaryColor: formData.get("primaryColor") ?? undefined,
    logoUrl: logoUrl || undefined,
    pasteContext: formData.get("pasteContext") ?? undefined,
  });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) throw new Error("No workspace");

  const baseSlug = slugify(parsed.name);
  let slug = baseSlug;
  let n = 1;
  while (
    await prisma.brand.findUnique({
      where: {
        workspaceId_slug: { workspaceId: membership.workspaceId, slug },
      },
    })
  ) {
    slug = `${baseSlug}-${++n}`;
  }

  const brand = await prisma.brand.create({
    data: {
      workspaceId: membership.workspaceId,
      name: parsed.name,
      slug,
      logoUrl: parsed.logoUrl || null,
      websiteUrl: parsed.websiteUrl || null,
      referenceUrls: parsed.referenceUrls,
      voiceGuide: parsed.voiceGuide,
      taboosList: parsed.taboosList,
      channels: parsed.channels.length ? parsed.channels : ["instagram"],
      colorTokens: {
        primary: parsed.primaryColor,
        ink: "#44546C",
        accent: "#9CC4AC",
      },
    },
  });

  (await cookies()).set(BRAND_COOKIE_NAME, brand.id, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Kick off a background signal-parse if the user pasted something meaningful.
  // Don't block the redirect — the user gets to Today fast; signals trickle in.
  if (parsed.pasteContext && parsed.pasteContext.trim().length > 40) {
    (async () => {
      try {
        const { parseBrandSignals, mergeBrandSignals } = await import(
          "@/lib/brand-signals"
        );
        const signals = await parseBrandSignals({
          brandName: brand.name,
          pastedText: parsed.pasteContext!,
          existingVoice: brand.voiceGuide,
          existingTaboos: brand.taboosList,
        });
        await mergeBrandSignals(brand.id, signals);
      } catch (err) {
        console.error("Intake paste parse failed (non-fatal):", err);
      }
    })();
  }

  revalidatePath("/app", "layout");
  redirect("/app/today");
}

// ── Brand page editors ────────────────────────────────────────

const colorTokensSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  highlight: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function updateColorTokens(
  brandId: string,
  tokens: Record<string, string>
) {
  await requireBrandAccess(brandId);
  const parsed = colorTokensSchema.parse(tokens);
  await prisma.brand.update({
    where: { id: brandId },
    data: { colorTokens: parsed },
  });
  revalidatePath("/app/brand");
  revalidatePath("/app", "layout");
}

export async function updateChannels(brandId: string, channels: string[]) {
  await requireBrandAccess(brandId);
  const valid = ["instagram", "facebook", "tiktok", "linkedin", "x", "threads", "youtube", "pinterest", "email"];
  const cleaned = channels
    .map((c) => c.toLowerCase().trim())
    .filter((c) => valid.includes(c));
  await prisma.brand.update({
    where: { id: brandId },
    data: { channels: cleaned },
  });
  revalidatePath("/app/brand");
}

export async function updateImageStyles(brandId: string, styles: string[]) {
  await requireBrandAccess(brandId);
  const { IMAGE_STYLES } = await import("@/lib/brand/image-styles");
  const valid = new Set(IMAGE_STYLES.map((s) => s.id));
  const cleaned = styles
    .map((s) => s.toLowerCase().trim())
    .filter((s) => valid.has(s as never));
  await prisma.brand.update({
    where: { id: brandId },
    data: { imageStyles: cleaned },
  });
  revalidatePath("/app/brand");
  revalidatePath("/app/today");
  revalidatePath("/app/library");
}

export async function updateBrandName(brandId: string, name: string) {
  await requireBrandAccess(brandId);
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new Error("Name required");
  await prisma.brand.update({
    where: { id: brandId },
    data: { name: clean },
  });
  revalidatePath("/app", "layout");
}

export async function removeBrandLogo(brandId: string) {
  await requireBrandAccess(brandId);
  await prisma.brand.update({
    where: { id: brandId },
    data: { logoUrl: null },
  });
  revalidatePath("/app/brand");
  revalidatePath("/app", "layout");
}
