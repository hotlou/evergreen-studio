import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-bg">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/icon-300.png"
            alt="Evergreen"
            width={36}
            height={36}
            priority
          />
          <span className="font-display text-xl text-slate-ink tracking-tight">
            Evergreen
          </span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm px-4 py-2 transition"
        >
          Sign in
        </Link>
      </header>

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-block font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-4">
          EVERGREEN STUDIO · V0.1
        </div>
        <h1 className="font-display text-5xl md:text-6xl text-slate-ink tracking-tight leading-[1.05] mb-6">
          Describe your brand once.
          <br />
          <span className="text-evergreen-600">Never run dry again.</span>
        </h1>
        <p className="text-lg text-slate-muted max-w-2xl mx-auto mb-10">
          A content workspace that remembers what it said yesterday, what&apos;s
          working, and what you banned. Daily on-brand content packs that don&apos;t
          repeat themselves, pulled from a library mined from your real post history.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm px-6 py-3 transition"
          >
            Start with a brand →
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <FeatureCard
            kicker="Memory"
            title="Brand-as-database"
            body="Pillars, angles, hooks, voice rules — all queryable. Every generation sees everything the brand has ever said."
          />
          <FeatureCard
            kicker="Anti-Repetition"
            title="Never the same post twice"
            body="Embedding-based rejection, stale-angle selection, pillar-mix balancing. Fresh output for weeks without supervision."
          />
          <FeatureCard
            kicker="Ingest"
            title="Cold-start eliminated"
            body="Connect Instagram → we score your last 200 posts, cluster them into pillars, and seed the library with your actual winners."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-line bg-white p-5 shadow-soft">
      <div className="font-mono text-[9px] uppercase tracking-widest text-evergreen-600 font-semibold mb-2">
        {kicker}
      </div>
      <div className="font-display text-lg text-slate-ink mb-1.5">{title}</div>
      <div className="text-sm text-slate-muted leading-relaxed">{body}</div>
    </div>
  );
}
