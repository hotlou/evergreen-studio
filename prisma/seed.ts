import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Dev user — matches the Credentials provider in lib/auth.ts (any email works).
  const user = await prisma.user.upsert({
    where: { email: "lou@evergreen.local" },
    update: {},
    create: {
      email: "lou@evergreen.local",
      name: "Lou",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "lou" },
    update: {},
    create: {
      name: "Lou's workspace",
      slug: "lou",
    },
  });

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: Role.owner,
    },
  });

  // Three dogfood brands, per the plan.
  const brands = [
    {
      slug: "combat-candy",
      name: "Combat Candy",
      voiceGuide:
        "Punchy, deadpan, self-aware. Humor lands through implication. Never sycophantic, never 'wellness-coded.' Lucy signs as @combatcrap. If it sounds like a supplement brand, rewrite it.",
      taboosList: ["melt", "gamechanger", "bio-hack", "clean", "detox"],
      colorTokens: {
        primary: "#B8472E",
        ink: "#2A3440",
        accent: "#C89545",
      },
    },
    {
      slug: "unbenchable",
      name: "Unbenchable",
      voiceGuide: "Builder voice. Direct, technical, shipping-minded. No marketing fluff.",
      taboosList: ["synergy", "leverage", "unlock"],
      colorTokens: {
        primary: "#111118",
        ink: "#E8E8EC",
        accent: "#B8FF3C",
      },
    },
    {
      slug: "lucy",
      name: "Lucy",
      voiceGuide:
        "Athlete-first. Training, fight prep, recovery. Grounded, specific, never inspirational-poster.",
      taboosList: ["journey", "grind", "mindset"],
      colorTokens: {
        primary: "#4C9C54",
        ink: "#44546C",
        accent: "#9CC4AC",
      },
    },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: b.slug } },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: b.name,
        slug: b.slug,
        voiceGuide: b.voiceGuide,
        taboosList: b.taboosList,
        channels: ["instagram"],
        colorTokens: b.colorTokens,
      },
    });
  }

  console.log("Seeded user + workspace + 3 brands.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
