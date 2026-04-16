import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Not found · Evergreen Studio" };

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-10">
          <Image
            src="/brand/icon-300.png"
            alt="Evergreen"
            width={44}
            height={44}
            priority
          />
          <div className="flex flex-col leading-none">
            <div className="font-display text-2xl text-slate-ink tracking-tight">
              Evergreen
            </div>
            <div className="font-sans text-[14px] font-light tracking-[0.2em] text-slate-ink/75 mt-0.5">
              STUDIO
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-line bg-white shadow-soft p-10">
          <div className="font-display text-6xl text-evergreen-600 mb-3">
            404
          </div>
          <h1 className="font-display text-xl text-slate-ink mb-2">
            This page isn&apos;t growing here
          </h1>
          <p className="text-sm text-slate-muted mb-6">
            The page you&apos;re looking for doesn&apos;t exist, moved, or was
            never planted.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/app/today"
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-500 hover:bg-evergreen-600 text-white font-semibold text-sm px-4 py-2.5 transition"
            >
              Back to Today
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-line text-slate-ink hover:bg-slate-bg font-semibold text-sm px-4 py-2.5 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
