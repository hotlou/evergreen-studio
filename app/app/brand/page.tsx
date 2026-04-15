import Link from "next/link";
import { getBrandContext } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";
import { LogoUploader } from "@/components/brand/LogoUploader";
import { ColorTokensEditor } from "@/components/brand/ColorTokensEditor";
import { ImageStylePills } from "@/components/brand/ImageStylePills";
import { PasteAnythingPanel } from "@/components/brand/PasteAnythingPanel";
import { ChannelsEditor } from "@/components/brand/ChannelsEditor";
import {
  BrandCreativeAssets,
  type CreativeAsset,
} from "@/components/brand/BrandCreativeAssets";
import { VoiceGuideEditor } from "@/components/strategy/VoiceGuideEditor";
import { TabooWordsEditor } from "@/components/strategy/TabooWordsEditor";

export const metadata = { title: "Brand · Evergreen Studio" };

export default async function BrandPage() {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const brand = ctx.currentBrand;

  const tokens = (brand.colorTokens ?? {}) as {
    primary?: string;
    ink?: string;
    accent?: string;
    background?: string;
    highlight?: string;
  };

  const initialTokens = {
    primary: tokens.primary ?? "#4EB35E",
    ink: tokens.ink ?? "#44546C",
    accent: tokens.accent ?? "#9CC4AC",
    background: tokens.background ?? "#F7F7F2",
    highlight: tokens.highlight ?? "#F4B942",
  };

  const creativeAssetRows = await prisma.mediaAsset.findMany({
    where: {
      brandId: brand.id,
      source: "uploaded",
      tags: { has: "creative-asset" },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const creativeAssets: CreativeAsset[] = creativeAssetRows.map((a) => ({
    id: a.id,
    kind: a.kind,
    url: a.url,
    caption: a.caption,
    tags: a.tags,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="px-8 py-7 max-w-4xl">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          BRAND · ASSETS · VOICE · PUBLISHING
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          {brand.name}
        </h1>
        <p className="text-sm text-slate-muted mt-1.5">
          Everything generation looks up — logo, palette, voice, taboos,
          channels. Teach the AI once; every piece inherits it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <LogoUploader
          brandId={brand.id}
          logoUrl={brand.logoUrl}
          primaryColor={initialTokens.primary}
        />
        <ChannelsEditor brandId={brand.id} initial={brand.channels} />
      </div>

      <div className="mb-4">
        <ColorTokensEditor brandId={brand.id} initial={initialTokens} />
      </div>

      <div className="mb-4">
        <ImageStylePills brandId={brand.id} initial={brand.imageStyles} />
      </div>

      <div className="mb-4">
        <PasteAnythingPanel brandId={brand.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <VoiceGuideEditor
          brandId={brand.id}
          initial={brand.voiceGuide ?? ""}
        />
        <TabooWordsEditor brandId={brand.id} initial={brand.taboosList} />
      </div>

      <div className="mb-4">
        <BrandCreativeAssets brandId={brand.id} assets={creativeAssets} />
      </div>

      <section className="rounded-xl border border-slate-line bg-white p-5 mb-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-1">
          PUBLISHING · AYRSHARE
        </div>
        <h2 className="font-display text-lg text-slate-ink mb-1">
          Unified publish
        </h2>
        <p className="text-sm text-slate-muted mb-3">
          v1 publishes through Ayrshare: one API key per workspace, per-brand
          account linking via Ayrshare&apos;s hosted OAuth. No Meta app review.
        </p>
        <div className="rounded-lg bg-slate-bg border border-slate-line p-3 text-xs text-slate-muted">
          Configuration unlocks in <span className="font-mono font-semibold">M7</span>.
          Until then, approval is a no-op and pieces stay in the app.
        </div>
      </section>

      <section className="rounded-xl border border-slate-line bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
              ACCOUNT · WORKSPACE
            </div>
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm mt-3">
              <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
                Email
              </dt>
              <dd className="text-slate-ink">{ctx.user.email}</dd>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
                Workspace
              </dt>
              <dd className="text-slate-ink">{ctx.workspace.name}</dd>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
                Slug
              </dt>
              <dd className="text-slate-ink font-mono">{brand.slug}</dd>
            </dl>
          </div>
          <Link
            href="/app/brands/new"
            className="rounded-lg border border-slate-line bg-white text-slate-ink text-xs font-semibold px-4 py-2 hover:bg-slate-bg"
          >
            Add another brand
          </Link>
        </div>
      </section>
    </div>
  );
}
