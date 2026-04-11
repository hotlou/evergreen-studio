import Link from "next/link";
import { getBrandContext } from "@/lib/brand";
import { EmptyBrandState } from "@/components/shell/EmptyBrandState";

export const metadata = { title: "Settings · Evergreen Studio" };

export default async function SettingsPage() {
  const ctx = await getBrandContext();
  if (!ctx?.currentBrand) {
    return (
      <div className="px-8 py-10">
        <EmptyBrandState />
      </div>
    );
  }

  const brand = ctx.currentBrand;
  const primary =
    (brand.colorTokens as { primary?: string } | null)?.primary ?? "#4EB35E";

  return (
    <div className="px-8 py-7 max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          BRAND · WORKSPACE · PUBLISHING
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          Settings
        </h1>
      </div>

      <section className="rounded-xl border border-slate-line bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold">
              CURRENT BRAND
            </div>
            <h2 className="font-display text-xl text-slate-ink mt-0.5">
              {brand.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded" style={{ background: primary }} />
            <code className="font-mono text-xs text-slate-muted">
              {primary.toUpperCase()}
            </code>
          </div>
        </div>
        <dl className="grid grid-cols-[140px_1fr] gap-y-3 gap-x-4 text-sm">
          <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
            Slug
          </dt>
          <dd className="text-slate-ink font-mono">{brand.slug}</dd>
          <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
            Channels
          </dt>
          <dd className="text-slate-ink">{brand.channels.join(", ") || "—"}</dd>
          <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
            Taboos
          </dt>
          <dd className="text-slate-ink">{brand.taboosList.length}</dd>
        </dl>

        <div className="mt-5 pt-5 border-t border-slate-line flex gap-2">
          <Link
            href="/app/brands/new"
            className="rounded-lg border border-slate-line bg-white text-slate-ink text-xs font-semibold px-4 py-2 hover:bg-slate-bg"
          >
            Add another brand
          </Link>
        </div>
      </section>

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
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-muted font-bold mb-1">
          ACCOUNT
        </div>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm">
          <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
            Email
          </dt>
          <dd className="text-slate-ink">{ctx.user.email}</dd>
          <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-muted font-bold pt-0.5">
            Workspace
          </dt>
          <dd className="text-slate-ink">{ctx.workspace.name}</dd>
        </dl>
      </section>
    </div>
  );
}
