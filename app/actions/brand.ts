"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BRAND_COOKIE_NAME } from "@/lib/brand";

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

  revalidatePath("/app", "layout");
  redirect("/app/today");
}
